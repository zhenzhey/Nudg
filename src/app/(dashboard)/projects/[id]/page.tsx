import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWeek,
  getGoalProgress,
  getDaysRemaining,
} from "@/lib/utils";
import type { Quest, Deliverable } from "@/types";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { ActiveProjectSync } from "@/components/layout/active-project-sync";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("goals").select("title").eq("id", id).single();
  return { title: data?.title ?? "Project" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quest, error } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !quest) notFound();

  quest.deliverables?.sort(
    (a: Deliverable, b: Deliverable) =>
      (a.order_index ?? a.week_number ?? 0) - (b.order_index ?? b.week_number ?? 0)
  );
  quest.deliverables?.forEach((d: Deliverable) => {
    d.tasks?.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  const currentWeek = getCurrentWeek(quest.start_date);
  const activeWeek = Math.min(currentWeek, quest.duration_weeks);
  const progress = getGoalProgress(quest as Quest);
  const daysLeft = getDaysRemaining(quest.start_date, activeWeek);
  const currentDeliverable =
    quest.deliverables?.find(
      (d: Deliverable) => d.status !== "submitted" && d.status !== "verified"
    ) ?? null;

  return (
    <>
      <ActiveProjectSync id={quest.id} title={quest.title} />
      <ProjectDetailView
        goalId={quest.id}
        projectTitle={quest.title}
        projectDescription={quest.description}
        startDate={quest.start_date}
        daysLeft={daysLeft}
        progressPercent={progress}
        deliverables={(quest.deliverables ?? []) as Deliverable[]}
        currentDeliverable={currentDeliverable as Deliverable | null}
        isProjectActive={quest.status === "active"}
      />
    </>
  );
}
