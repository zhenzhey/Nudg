import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeekCalendar, type CalendarTask } from "@/components/calendar/week-calendar";
import type { Project } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar" };

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekStart = getMondayOf(new Date());
  const weekEnd = addDays(weekStart, 6);

  // Fetch all active projects with deliverables + tasks for context
  const { data: projects } = await supabase
    .from("goals")
    .select("id, title, status, start_date, description, duration_weeks, ai_plan, created_at, updated_at, user_id, deliverables(id, title, tasks(*))")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Fetch standalone tasks for this week
  const { data: standaloneTasks } = await supabase
    .from("tasks")
    .select("*")
    .is("deliverable_id", null)
    .eq("user_id", user.id)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd);

  // Build initial calendar tasks with project context
  const initialTasks: CalendarTask[] = [];

  for (const project of projects ?? []) {
    type RawDeliverable = { id: string; title: string; tasks: CalendarTask[] };
    for (const deliverable of (project.deliverables as RawDeliverable[]) ?? []) {
      for (const task of deliverable.tasks ?? []) {
        if (
          task.scheduled_date &&
          task.scheduled_date >= weekStart &&
          task.scheduled_date <= weekEnd &&
          task.scheduled_time != null
        ) {
          initialTasks.push({
            ...task,
            deliverable_title: deliverable.title,
            project_title: project.title,
            project_id: project.id,
          });
        }
      }
    }
  }

  for (const task of standaloneTasks ?? []) {
    if (task.scheduled_time != null) {
      initialTasks.push({ ...task, deliverable_title: null, project_title: null, project_id: null });
    }
  }

  return (
    // overflow-hidden stops the body from scrolling; only the inner grid scrolls
    <div className="p-4 md:p-5 flex flex-col" style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>
      <div className="flex-1 min-h-0 rounded-2xl border border-outline/15 shadow-card overflow-hidden flex flex-col">
        <WeekCalendar
          initialTasks={initialTasks}
          projects={(projects ?? []) as Project[]}
          currentWeekStart={weekStart}
        />
      </div>
    </div>
  );
}
