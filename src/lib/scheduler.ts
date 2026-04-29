// Deadline-aware task scheduler. Places each task on a day in [today, due_date]
// at a free 30-minute slot inside the work window (default 9am–9pm). Unlike
// plan-week's Mon–Fri-only algorithm, this allows weekends.
//
// Inputs are pure data — no DB / Supabase calls — so this can be unit-tested
// and reused by any route that wants to schedule tasks.

export interface OccupiedSlot {
  start: number;   // hour float, e.g. 14.5 = 2:30pm
  duration: number; // hours
}

export interface SchedulableTask {
  id: string;
  estimated_hours: number | null;
  due_date: string | null;       // YYYY-MM-DD; null → treated as far future
  scheduled_date?: string | null; // existing schedule (preserved if still in window)
  scheduled_time?: number | null;
}

export interface ScheduledPlacement {
  id: string;
  date: string; // YYYY-MM-DD
  hour: number; // float
}

export type UnscheduledReason =
  | "due_date_passed"
  | "no_free_slot_in_window"
  | "task_too_long_for_window";

export interface UnscheduledTask {
  id: string;
  reason: UnscheduledReason;
}

export interface ScheduleResult {
  placements: ScheduledPlacement[];
  unscheduled: UnscheduledTask[];
}

export interface ScheduleOptions {
  today?: string;     // YYYY-MM-DD; defaults to today
  workStart?: number; // default 9
  workEnd?: number;   // default 21 (9pm)
  /** Existing occupied slots per date that the scheduler must avoid. */
  occupied?: Map<string, OccupiedSlot[]>;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a: string, b: string): number {
  const aDate = new Date(a + "T00:00:00").getTime();
  const bDate = new Date(b + "T00:00:00").getTime();
  return Math.round((bDate - aDate) / 86_400_000);
}

function hasConflict(slots: OccupiedSlot[], start: number, dur: number): boolean {
  return slots.some((s) => s.start < start + dur && s.start + s.duration > start);
}

// First free slot ≥ wantedStart (snapped to 30-min) for a given duration.
function findSlotFrom(
  slots: OccupiedSlot[],
  wantedStart: number,
  dur: number,
  dayEnd: number
): number | null {
  let h = Math.ceil(wantedStart * 2) / 2;
  while (h + dur <= dayEnd) {
    if (!hasConflict(slots, h, dur)) return h;
    h += 0.5;
  }
  return null;
}

/**
 * Schedule a batch of tasks. Returns placements in input order; tasks that
 * couldn't be placed are omitted from the result.
 *
 * Strategy: spread tasks across the days available before each task's
 * `due_date`. Earlier-due tasks get earlier days; if a task's window has
 * multiple days, prefer the earlier ones to avoid bunching at the deadline.
 */
export function scheduleTasks(
  tasks: SchedulableTask[],
  options: ScheduleOptions = {}
): ScheduleResult {
  const today = options.today ?? isoDate(new Date());
  const workStart = options.workStart ?? 9;
  const workEnd = options.workEnd ?? 21;
  const occupied = new Map(options.occupied ?? new Map<string, OccupiedSlot[]>());

  const nowHour = (() => {
    if (options.today) return workStart; // explicit today override → no wall clock
    const n = new Date();
    return n.getHours() + n.getMinutes() / 60;
  })();

  const placements: ScheduledPlacement[] = [];
  const unscheduled: UnscheduledTask[] = [];

  // Sort tasks by due_date ascending so urgent items get first dibs on days.
  const indexed = tasks.map((t, i) => ({ t, i }));
  indexed.sort((a, b) => {
    const ad = a.t.due_date ?? "9999-99-99";
    const bd = b.t.due_date ?? "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.i - b.i;
  });

  // Spread tasks across the union window [today, latestDue]: task at position
  // pos of N targets offset = round(pos / N * span). This places the first
  // task at today and the last at (N-1)/N of the span — leaving ~span/N days
  // of buffer before the deadline rather than parking work on due_date itself.
  // Each target is capped by the task's own due_date as a hard upper bound.
  const latestDue = indexed.reduce((acc, { t }) => {
    const d = t.due_date ?? addDays(today, 30);
    return d > acc ? d : acc;
  }, today);
  const unionSpan = Math.max(0, daysBetween(today, latestDue));
  const N = indexed.length;

  for (let pos = 0; pos < indexed.length; pos++) {
    const { t } = indexed[pos];
    const dur = t.estimated_hours ?? 1;
    const due = t.due_date ?? addDays(today, 30);
    if (due < today) {
      unscheduled.push({ id: t.id, reason: "due_date_passed" });
      continue;
    }

    // Task longer than the entire daily window can never fit anywhere.
    if (dur > workEnd - workStart) {
      unscheduled.push({ id: t.id, reason: "task_too_long_for_window" });
      continue;
    }

    const span = Math.max(0, daysBetween(today, due));
    const candidateDates: string[] = [];
    for (let i = 0; i <= span; i++) candidateDates.push(addDays(today, i));

    // Ideal day for this task within the union window, capped at its own due.
    const idealOffsetInUnion = N > 0 ? Math.round((pos / N) * unionSpan) : 0;
    const targetOffset = Math.min(span, idealOffsetInUnion);
    const target = addDays(today, targetOffset);

    candidateDates.sort((a, b) => {
      const da = Math.abs(daysBetween(a, target));
      const db = Math.abs(daysBetween(b, target));
      if (da !== db) return da - db;
      // Tiebreak: prefer earlier day to keep buffer before deadline.
      return a < b ? -1 : 1;
    });

    let placed: ScheduledPlacement | null = null;
    for (const date of candidateDates) {
      const isToday = date === today;
      const dayStart = isToday
        ? Math.max(workStart, Math.ceil((nowHour + 0.5) * 2) / 2)
        : workStart;
      if (dayStart + dur > workEnd) continue;

      const daySlots = occupied.get(date) ?? [];
      const hour = findSlotFrom(daySlots, dayStart, dur, workEnd);
      if (hour !== null) {
        daySlots.push({ start: hour, duration: dur });
        occupied.set(date, daySlots);
        placed = { id: t.id, date, hour };
        break;
      }
    }

    if (placed) {
      placements.push(placed);
    } else {
      unscheduled.push({ id: t.id, reason: "no_free_slot_in_window" });
    }
  }

  return { placements, unscheduled };
}
