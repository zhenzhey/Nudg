import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LaunchView } from "@/components/projects/launch-view";
import type { Deliverable, Project, Task } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Launch project" };

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default async function ProjectLaunchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("goals")
    .select("*, deliverables(*, tasks(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const deliverables = (project.deliverables as Deliverable[]) ?? [];
  deliverables.sort(
    (a, b) => (a.order_index ?? a.week_number ?? 0) - (b.order_index ?? b.week_number ?? 0)
  );
  const firstDeliverable = deliverables[0];
  if (!firstDeliverable) notFound();

  const tasks = (firstDeliverable.tasks ?? []) as Task[];
  tasks.sort((a, b) => {
    const ad = a.due_date ?? "9999-99-99";
    const bd = b.due_date ?? "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const weekStart = getMondayOf(new Date());

  return (
    <LaunchView
      project={project as Project}
      deliverable={firstDeliverable}
      initialTasks={tasks}
      weekStart={weekStart}
    />
  );
}
