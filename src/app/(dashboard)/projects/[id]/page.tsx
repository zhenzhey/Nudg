import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWeek,
  getGoalProgress,
  getDaysRemaining,
  calculateStreak,
} from "@/lib/utils";
import type { Quest, Deliverable } from "@/types";
import { ArrowLeft, Flame } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { ActiveProjectSync } from "@/components/layout/active-project-sync";
import { cn } from "@/lib/utils";
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
  const streak = calculateStreak(quest.deliverables ?? []);
  const daysLeft = getDaysRemaining(quest.start_date, activeWeek);
  const currentDeliverable =
    quest.deliverables?.find(
      (d: Deliverable) => d.status !== "submitted" && d.status !== "verified"
    ) ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-slide-up">
      <ActiveProjectSync id={quest.id} title={quest.title} />
      <Link href="/dashboard">
        <button className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary mb-4 transition-colors font-medium cursor-pointer">
          <ArrowLeft size={13} />
          Dashboard
        </button>
      </Link>

      {/* Compact header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-bold text-on-surface truncate">
              {quest.title}
            </h1>
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                quest.status === "active"
                  ? "bg-success animate-pulse"
                  : "bg-on-surface-variant"
              )}
            />
          </div>
          <DeleteProjectButton projectId={quest.id} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="progress-bar flex-1">
            <div
              className="progress-fill bg-gradient-to-r from-primary to-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-on-surface tabular-nums shrink-0">
            {progress}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
          <span>
            Week {activeWeek}/{quest.duration_weeks}
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <Flame size={11} />
              {streak}
            </span>
          )}
          {quest.status === "active" && daysLeft > 0 && (
            <span className={cn(daysLeft <= 2 && "text-error")}>
              {daysLeft}d left
            </span>
          )}
        </div>
      </div>

      <ProjectDetailView
        goalId={quest.id}
        deliverables={(quest.deliverables ?? []) as Deliverable[]}
        currentDeliverable={currentDeliverable as Deliverable | null}
        isProjectActive={quest.status === "active"}
      />
    </div>
  );
}
