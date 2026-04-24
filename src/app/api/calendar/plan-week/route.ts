import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const PlanWeekSchema = z.object({
  project_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface OccupiedSlot { start: number; duration: number }

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function hasConflict(slots: OccupiedSlot[], start: number, dur: number): boolean {
  return slots.some((s) => s.start < start + dur && s.start + s.duration > start);
}

// Find the first free slot >= wantedStart within [dayStart, 22] for a given duration
function findSlotFrom(
  slots: OccupiedSlot[],
  wantedStart: number,
  dur: number,
  dayEnd = 22
): number | null {
  // Snap to nearest 30-min
  let h = Math.ceil(wantedStart * 2) / 2;
  while (h + dur <= dayEnd) {
    if (!hasConflict(slots, h, dur)) return h;
    h += 0.5;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = PlanWeekSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { project_id, week_start } = parsed.data;

    const { data: project } = await supabase
      .from("goals")
      .select("id, title, start_date, deliverables(id, title, week_number, tasks(*))")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Determine deliverable for this week
    const projectStart = new Date(project.start_date + "T00:00:00");
    const weekStartDate = new Date(week_start + "T00:00:00");
    const daysSince = Math.floor((weekStartDate.getTime() - projectStart.getTime()) / 86400_000);
    const weekNum = Math.max(1, Math.floor(daysSince / 7) + 1);

    type RawTask = {
      id: string; status: string; scheduled_date: string | null; scheduled_time: number | null;
      estimated_hours: number | null; title: string; description: string | null; deliverable_id: string | null; completed_at: string | null; created_at: string;
    };
    type RawDeliverable = { id: string; title: string; week_number: number; tasks: RawTask[] };

    const deliverables = project.deliverables as RawDeliverable[];
    const deliverable = deliverables?.find((d) => d.week_number === weekNum);
    if (!deliverable) return NextResponse.json({ error: "No deliverable for this week" }, { status: 404 });

    const weekEnd = addDays(week_start, 6);

    // Tasks that still need scheduling this week
    const tasksToSchedule = (deliverable.tasks ?? []).filter(
      (t: RawTask) =>
        t.status !== "completed" &&
        !(t.scheduled_date && t.scheduled_date >= week_start && t.scheduled_date <= weekEnd)
    );

    if (tasksToSchedule.length === 0) {
      return NextResponse.json({ tasks: [], message: "All tasks already scheduled", scheduled: 0 });
    }

    // Build occupied map from existing week tasks
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("scheduled_date, scheduled_time, estimated_hours")
      .gte("scheduled_date", week_start)
      .lte("scheduled_date", weekEnd)
      .not("scheduled_time", "is", null);

    const occupied = new Map<string, OccupiedSlot[]>();
    for (const t of existingTasks ?? []) {
      if (t.scheduled_date && t.scheduled_time != null) {
        const list = occupied.get(t.scheduled_date) ?? [];
        list.push({ start: t.scheduled_time, duration: t.estimated_hours ?? 1 });
        occupied.set(t.scheduled_date, list);
      }
    }

    // Determine available working days
    const nowDate = new Date();
    const nowDateStr = isoDate(nowDate);
    const nowHour = nowDate.getHours() + nowDate.getMinutes() / 60;

    // Mon–Fri of the week
    const allWorkDays = Array.from({ length: 5 }, (_, i) => addDays(week_start, i));

    // If scheduling current week, only use today onwards; otherwise use all work days
    const workDays = allWorkDays.some((d) => d >= nowDateStr)
      ? allWorkDays.filter((d) => d >= nowDateStr)
      : allWorkDays; // past week — use all (best effort)

    const WORK_START = 9;
    const WORK_END = 21; // 9pm
    const WORK_WINDOW = WORK_END - WORK_START;

    // Round-robin assign tasks to days for even distribution
    const dayBuckets = new Map<string, RawTask[]>();
    workDays.forEach((d) => dayBuckets.set(d, []));
    tasksToSchedule.forEach((task, i) => {
      dayBuckets.get(workDays[i % workDays.length])!.push(task);
    });

    const scheduled: Array<{ id: string; date: string; hour: number }> = [];

    for (const date of workDays) {
      const dayTasks = dayBuckets.get(date) ?? [];
      if (dayTasks.length === 0) continue;

      const isToday = date === nowDateStr;
      // Today: start after current time + 30min buffer; other days: WORK_START
      const dayStart = isToday ? Math.max(WORK_START, Math.ceil((nowHour + 0.5) * 2) / 2) : WORK_START;

      const totalTaskHours = dayTasks.reduce((s, t) => s + (t.estimated_hours ?? 1), 0);
      const available = WORK_END - dayStart;

      // Distribute tasks with even gaps (not back-to-back)
      const numGaps = dayTasks.length + 1;
      const gap = Math.max(0.5, (available - totalTaskHours) / numGaps);

      let cursor = dayStart + gap;
      const dayOccupied = occupied.get(date) ?? [];

      for (const task of dayTasks) {
        const dur = task.estimated_hours ?? 1;
        const hour = findSlotFrom(dayOccupied, cursor, dur, WORK_END);

        if (hour !== null) {
          dayOccupied.push({ start: hour, duration: dur });
          occupied.set(date, dayOccupied);
          scheduled.push({ id: task.id, date, hour });
          cursor = hour + dur + gap;
        } else {
          // Try any remaining slot in the day
          const fallback = findSlotFrom(dayOccupied, dayStart, dur, WORK_END);
          if (fallback !== null) {
            dayOccupied.push({ start: fallback, duration: dur });
            occupied.set(date, dayOccupied);
            scheduled.push({ id: task.id, date, hour: fallback });
          }
          // If still no slot, leave unscheduled (don't overflow to weekend)
        }
      }
    }

    // Persist
    const updatedTasks = await Promise.all(
      scheduled.map(async ({ id, date, hour }) => {
        const { data } = await supabase
          .from("tasks")
          .update({ scheduled_date: date, scheduled_time: hour })
          .eq("id", id)
          .select()
          .single();
        return data;
      })
    );

    const calendarTasks = updatedTasks.filter(Boolean).map((t) => ({
      ...t,
      deliverable_title: deliverable.title,
      project_title: project.title,
      project_id: project.id,
    }));

    return NextResponse.json({ tasks: calendarTasks, scheduled: scheduled.length });
  } catch (err) {
    console.error("[api/calendar/plan-week POST]", err);
    return NextResponse.json({ error: "Failed to plan week" }, { status: 500 });
  }
}
