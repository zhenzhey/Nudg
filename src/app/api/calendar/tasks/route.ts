import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const weekStart = url.searchParams.get("week_start");
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: "Invalid week_start" }, { status: 400 });
    }

    const weekEnd = new Date(weekStart + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Fetch all active projects with deliverables + tasks for context
    const { data: projects } = await supabase
      .from("goals")
      .select("id, title, deliverables(id, title, tasks(*))")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Fetch standalone tasks for the week
    const { data: standaloneTasks } = await supabase
      .from("tasks")
      .select("*")
      .is("deliverable_id", null)
      .eq("user_id", user.id)
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEndStr);

    const calendarTasks: Array<Record<string, unknown>> = [];

    // Flatten project tasks scheduled for the week
    for (const project of projects ?? []) {
      for (const deliverable of (project.deliverables as Array<{ id: string; title: string; tasks: Array<Record<string, unknown>> }>) ?? []) {
        for (const task of deliverable.tasks ?? []) {
          if (
            task.scheduled_date &&
            task.scheduled_date >= weekStart &&
            task.scheduled_date <= weekEndStr
          ) {
            calendarTasks.push({
              ...task,
              deliverable_title: deliverable.title,
              project_title: project.title,
              project_id: project.id,
            });
          }
        }
      }
    }

    // Add standalone tasks
    for (const task of standaloneTasks ?? []) {
      calendarTasks.push({ ...task, deliverable_title: null, project_title: null, project_id: null });
    }

    return NextResponse.json({ tasks: calendarTasks });
  } catch (err) {
    console.error("[api/calendar/tasks GET]", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
