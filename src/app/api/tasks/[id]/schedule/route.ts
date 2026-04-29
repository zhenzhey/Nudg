import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { listPrimaryBusy, busyToOccupiedSlots } from "@/lib/google/calendar";
import { upsertTaskEvent, clearTaskEvent } from "@/lib/google/sync";
import { isGoogleConnected, GoogleNotConnectedError } from "@/lib/google/token";

const ScheduleSchema = z.object({
  scheduled_date: z.string().nullable(),
  scheduled_time: z.number().nullable().optional(),
});

const WORK_START = 9;
const WORK_END = 21;

function findFreeSlot(
  occupied: Array<{ start: number; duration: number }>,
  wantedStart: number,
  duration: number
): number | null {
  let h = Math.ceil(wantedStart * 2) / 2;
  while (h + duration <= WORK_END) {
    const conflicts = occupied.some((s) => s.start < h + duration && s.start + s.duration > h);
    if (!conflicts) return h;
    h += 0.5;
  }
  return null;
}

// PATCH /api/tasks/[id]/schedule — set or clear a task's scheduled date.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data: taskRow } = await supabase
      .from("tasks")
      .select("id, title, description, estimated_hours, google_event_id")
      .eq("id", id)
      .single();

    // Any reschedule clears a prior "Keep" dismissal so a fresh conflict on
    // the new slot can re-surface.
    const update: Record<string, unknown> = {
      scheduled_date: parsed.data.scheduled_date,
      conflict_dismissed_at: null,
    };

    if (parsed.data.scheduled_time !== undefined) {
      update.scheduled_time = parsed.data.scheduled_time;
    } else if (parsed.data.scheduled_date) {
      const duration = Math.max(0.5, Number(taskRow?.estimated_hours ?? 1));

      const { data: dayTasks } = await supabase
        .from("tasks")
        .select("id, scheduled_time, estimated_hours")
        .eq("scheduled_date", parsed.data.scheduled_date)
        .not("scheduled_time", "is", null)
        .neq("id", id);

      const occupied = (dayTasks ?? [])
        .filter((t) => t.scheduled_time != null)
        .map((t) => ({
          start: Number(t.scheduled_time),
          duration: Number(t.estimated_hours ?? 1),
        }));

      // Merge Google Calendar busy times for that day.
      if (await isGoogleConnected(user.id)) {
        try {
          const dayStart = new Date(`${parsed.data.scheduled_date}T00:00:00`);
          const dayEnd = new Date(`${parsed.data.scheduled_date}T23:59:59`);
          const busy = await listPrimaryBusy(user.id, dayStart, dayEnd);
          occupied.push(...busyToOccupiedSlots(busy, parsed.data.scheduled_date));
        } catch (e) {
          if (!(e instanceof GoogleNotConnectedError)) {
            console.error("[task-schedule] google busy fetch failed", e);
          }
        }
      }

      const today = new Date().toISOString().slice(0, 10);
      const isToday = parsed.data.scheduled_date === today;
      const earliest = isToday
        ? Math.max(WORK_START, (() => {
            const n = new Date();
            return Math.ceil((n.getHours() + n.getMinutes() / 60 + 0.5) * 2) / 2;
          })())
        : WORK_START;

      const slot = findFreeSlot(occupied, earliest, duration);
      if (slot === null) {
        return NextResponse.json(
          {
            error: "no_free_slot",
            message: `No free ${duration}h slot on ${parsed.data.scheduled_date} between 9am–9pm. Try another day, shorten the task, or schedule manually.`,
            window: { start: WORK_START, end: WORK_END },
          },
          { status: 409 }
        );
      }
      update.scheduled_time = slot;
    } else {
      update.scheduled_time = null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Sync to Google Calendar.
    if (data.scheduled_date && data.scheduled_time != null) {
      await upsertTaskEvent(user.id, {
        id: data.id,
        title: data.title,
        description: data.description,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        estimated_hours: data.estimated_hours,
        google_event_id: taskRow?.google_event_id ?? null,
      });
    } else {
      await clearTaskEvent(user.id, {
        id: data.id,
        google_event_id: taskRow?.google_event_id ?? null,
      });
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("[api/tasks/[id]/schedule] Error:", err);
    return NextResponse.json({ error: "Failed to schedule task" }, { status: 500 });
  }
}
