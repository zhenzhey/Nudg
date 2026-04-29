import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPrimaryBusy } from "@/lib/google/calendar";
import { isGoogleConnected, GoogleNotConnectedError } from "@/lib/google/token";

const HORIZON_DAYS = 7;

interface BusyEvent {
  start: Date;
  end: Date;
  title?: string;
}

function taskInterval(task: { scheduled_date: string; scheduled_time: number; estimated_hours: number | null }): { start: Date; end: Date } {
  const [y, m, d] = task.scheduled_date.split("-").map(Number);
  const hour = Math.floor(task.scheduled_time);
  const minute = Math.round((task.scheduled_time - hour) * 60);
  const start = new Date(y, m - 1, d, hour, minute);
  const dur = Math.max(0.5, task.estimated_hours ?? 1);
  return { start, end: new Date(start.getTime() + dur * 3_600_000) };
}

function overlaps(a: { start: Date; end: Date }, b: BusyEvent): boolean {
  return a.start < b.end && b.start < a.end;
}

// GET /api/google/conflicts
// Returns tasks scheduled in the next HORIZON_DAYS that overlap a primary-calendar
// event the user hasn't dismissed yet.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await isGoogleConnected(user.id))) {
      return NextResponse.json({ connected: false, conflicts: [] });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + HORIZON_DAYS);
    const horizonStr = horizon.toISOString().slice(0, 10);

    // Pull scheduled non-completed tasks owned by this user in the horizon.
    // RLS ensures we only see this user's tasks.
    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        id, title, scheduled_date, scheduled_time, estimated_hours, status,
        conflict_dismissed_at,
        deliverables(id, title, goals(id, title, user_id))
      `)
      .gte("scheduled_date", todayStr)
      .lte("scheduled_date", horizonStr)
      .not("scheduled_time", "is", null)
      .neq("status", "completed")
      .is("conflict_dismissed_at", null);

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ connected: true, conflicts: [] });
    }

    let busy: BusyEvent[];
    try {
      busy = await listPrimaryBusy(
        user.id,
        new Date(`${todayStr}T00:00:00`),
        new Date(`${horizonStr}T23:59:59`)
      );
    } catch (e) {
      if (e instanceof GoogleNotConnectedError) {
        return NextResponse.json({ connected: false, conflicts: [] });
      }
      throw e;
    }

    type TaskRow = typeof tasks[number];
    const conflicts: Array<{
      task: {
        id: string;
        title: string;
        scheduled_date: string;
        scheduled_time: number;
        estimated_hours: number | null;
        deliverable_title?: string;
        project_title?: string;
      };
      blocking_event: { title: string; startISO: string; endISO: string };
    }> = [];

    for (const t of tasks as TaskRow[]) {
      if (!t.scheduled_date || t.scheduled_time == null) continue;
      const interval = taskInterval({
        scheduled_date: t.scheduled_date,
        scheduled_time: t.scheduled_time,
        estimated_hours: t.estimated_hours,
      });
      const blocker = busy.find((b) => overlaps(interval, b));
      if (!blocker) continue;

      const deliverable = t.deliverables as unknown as
        | { title?: string; goals?: { title?: string } }
        | null;

      conflicts.push({
        task: {
          id: t.id,
          title: t.title,
          scheduled_date: t.scheduled_date,
          scheduled_time: t.scheduled_time,
          estimated_hours: t.estimated_hours,
          deliverable_title: deliverable?.title,
          project_title: deliverable?.goals?.title,
        },
        blocking_event: {
          title: blocker.title ?? "(busy)",
          startISO: blocker.start.toISOString(),
          endISO: blocker.end.toISOString(),
        },
      });
    }

    return NextResponse.json({ connected: true, conflicts });
  } catch (err) {
    console.error("[api/google/conflicts]", err);
    return NextResponse.json({ error: "Failed to detect conflicts" }, { status: 500 });
  }
}
