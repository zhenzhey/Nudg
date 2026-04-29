import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleTasks, type OccupiedSlot, type SchedulableTask } from "@/lib/scheduler";
import { listPrimaryBusy, busyToOccupiedSlots } from "@/lib/google/calendar";
import { upsertTaskEvent } from "@/lib/google/sync";
import { isGoogleConnected, GoogleNotConnectedError } from "@/lib/google/token";

interface ScheduleBody {
  /** If true, ignore any current scheduled_date/time on the deliverable's tasks. */
  reschedule_all?: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: ScheduleBody = await request.json().catch(() => ({}));

    const { data: deliverable } = await supabase
      .from("deliverables")
      .select("id, title, due_date, goals(id, user_id, title), tasks(*)")
      .eq("id", id)
      .single();

    const goals = deliverable?.goals as unknown as { id: string; user_id: string; title: string } | null;
    if (!deliverable || !goals || goals.user_id !== user.id) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    type RawTask = SchedulableTask & {
      status: string;
      title: string;
      description: string | null;
      google_event_id: string | null;
    };
    const allTasks = (deliverable.tasks ?? []) as RawTask[];

    const today = new Date().toISOString().slice(0, 10);

    const tasksToSchedule = allTasks.filter((t) => {
      if (t.status === "completed") return false;
      if (body.reschedule_all) return true;
      return !t.scheduled_date || !t.scheduled_time;
    });

    if (tasksToSchedule.length === 0) {
      return NextResponse.json({ tasks: [], scheduled: 0, message: "Nothing to schedule" });
    }

    if (body.reschedule_all) {
      await supabase
        .from("tasks")
        .update({ scheduled_date: null, scheduled_time: null })
        .in("id", tasksToSchedule.map((t) => t.id));
    }

    const latestDue = tasksToSchedule
      .map((t) => t.due_date)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1);

    const horizonEnd = latestDue ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })();

    // Existing scheduled tasks (any deliverable) inside [today, horizonEnd].
    const { data: existing } = await supabase
      .from("tasks")
      .select("id, scheduled_date, scheduled_time, estimated_hours")
      .gte("scheduled_date", today)
      .lte("scheduled_date", horizonEnd)
      .not("scheduled_time", "is", null);

    const skipIds = new Set(
      body.reschedule_all ? tasksToSchedule.map((t) => t.id) : []
    );

    const occupied = new Map<string, OccupiedSlot[]>();
    for (const t of existing ?? []) {
      if (!t.scheduled_date || t.scheduled_time == null) continue;
      if (skipIds.has(t.id)) continue;
      const list = occupied.get(t.scheduled_date) ?? [];
      list.push({ start: t.scheduled_time, duration: t.estimated_hours ?? 1 });
      occupied.set(t.scheduled_date, list);
    }

    // Merge in Google Calendar busy times if connected.
    if (await isGoogleConnected(user.id)) {
      try {
        const busy = await listPrimaryBusy(
          user.id,
          new Date(`${today}T00:00:00`),
          new Date(`${horizonEnd}T23:59:59`)
        );
        for (let d = today; d <= horizonEnd; d = nextDay(d)) {
          const slots = busyToOccupiedSlots(busy, d);
          if (slots.length === 0) continue;
          const list = occupied.get(d) ?? [];
          list.push(...slots);
          occupied.set(d, list);
        }
      } catch (e) {
        if (!(e instanceof GoogleNotConnectedError)) {
          console.error("[deliverable-schedule] google busy fetch failed", e);
        }
        // Proceed without google busy times.
      }
    }

    const { placements, unscheduled } = scheduleTasks(
      tasksToSchedule.map((t) => ({
        id: t.id,
        estimated_hours: t.estimated_hours,
        due_date: t.due_date,
      })),
      { occupied }
    );

    // Persist DB changes first; Google sync is best-effort.
    const taskById = new Map(tasksToSchedule.map((t) => [t.id, t]));
    const updated = await Promise.all(
      placements.map(async ({ id: taskId, date, hour }) => {
        const { data } = await supabase
          .from("tasks")
          .update({ scheduled_date: date, scheduled_time: hour, conflict_dismissed_at: null })
          .eq("id", taskId)
          .select()
          .single();
        return data;
      })
    );

    // Sync Google events for placed tasks (parallel, errors logged not thrown).
    await Promise.all(
      updated.filter(Boolean).map((t) => {
        const orig = taskById.get(t!.id);
        return upsertTaskEvent(user.id, {
          id: t!.id,
          title: t!.title ?? orig?.title ?? "Task",
          description: t!.description ?? orig?.description ?? null,
          scheduled_date: t!.scheduled_date,
          scheduled_time: t!.scheduled_time,
          estimated_hours: t!.estimated_hours,
          google_event_id: orig?.google_event_id ?? null,
        });
      })
    );

    const calendarTasks = updated.filter(Boolean).map((t) => ({
      ...t,
      deliverable_title: deliverable.title,
      project_title: goals.title,
      project_id: goals.id,
    }));

    return NextResponse.json({
      tasks: calendarTasks,
      scheduled: placements.length,
      unscheduled: unscheduled.length,
      unscheduled_details: unscheduled.map((u) => {
        const t = taskById.get(u.id);
        return { id: u.id, title: t?.title, reason: u.reason };
      }),
      window: { start: 9, end: 21 },
    });
  } catch (err) {
    console.error("[api/deliverables/[id]/schedule POST]", err);
    return NextResponse.json({ error: "Failed to schedule tasks" }, { status: 500 });
  }
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
