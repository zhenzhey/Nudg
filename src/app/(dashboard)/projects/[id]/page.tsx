import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeliverableTasks } from "@/components/deliverables/deliverable-tasks";
import { SubmissionForm } from "@/components/deliverables/submission-form";
import { StatusBadge } from "@/components/ui/badge";
import {
  getCurrentWeek,
  getGoalProgress,
  getDaysRemaining,
  formatDate,
  calculateStreak,
  getDeliverableTaskProgress,
} from "@/lib/utils";
import type { Quest, Deliverable } from "@/types";
import { VERIFICATION_TYPE_LABELS } from "@/types";
import { ArrowLeft, Flame, CheckCircle2, Lock, Calendar } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
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
  // First non-submitted deliverable in order_index order. Plans can be
  // milestone-based (week_number null) so we don't key off week_number here.
  const currentDeliverable = quest.deliverables?.find(
    (d: Deliverable) => d.status !== "submitted" && d.status !== "verified"
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      <Link href="/dashboard">
        <button className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary mb-6 transition-colors font-medium">
          <ArrowLeft size={14} />
          Dashboard
        </button>
      </Link>

      {/* Project header */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 mb-6 shadow-kinetic-card ring-1 ring-outline-variant/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-on-surface">{quest.title}</h1>
            {quest.description && (
              <p className="text-sm text-on-surface-variant mt-1">{quest.description}</p>
            )}
          </div>
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full mt-2 shrink-0",
              quest.status === "active" ? "bg-success animate-pulse" : "bg-on-surface-variant"
            )}
          />
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span>Week {activeWeek} of {quest.duration_weeks}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-primary to-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            Started {formatDate(quest.start_date)}
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Flame size={12} />
              {streak} week streak
            </div>
          )}
          {quest.status === "active" && daysLeft > 0 && (
            <div className={cn("flex items-center gap-1", daysLeft <= 2 && "text-error")}>
              {daysLeft}d until week ends
            </div>
          )}
          <div className="ml-auto">
            <DeleteProjectButton projectId={quest.id} />
          </div>
        </div>
      </div>

      {/* Current week */}
      {currentDeliverable && quest.status === "active" && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            This week
          </h2>
          <div className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-6 shadow-kinetic-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-xs text-primary font-mono font-semibold mb-1.5">
                  Deliverable {(currentDeliverable.order_index ?? 0) + 1}
                </div>
                <h3 className="text-lg font-bold text-on-surface">
                  {currentDeliverable.title}
                </h3>
                {currentDeliverable.description && (
                  <p className="text-sm text-on-surface-variant mt-1">
                    {currentDeliverable.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={currentDeliverable.status} />
                <span className="inline-flex items-center px-2.5 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-medium">
                  {VERIFICATION_TYPE_LABELS[(currentDeliverable.verification_type ?? "manual_upload") as import("@/types").VerificationType]}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <DeliverableTasks
                tasks={currentDeliverable.tasks ?? []}
                deliverableId={currentDeliverable.id}
              />
            </div>

            <SubmissionForm deliverable={currentDeliverable as Deliverable} goalId={quest.id} />
          </div>
        </div>
      )}

      {/* Full plan timeline */}
      <div>
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          Full roadmap
        </h2>
        <div className="space-y-2">
          {(quest.deliverables ?? []).map((deliverable: Deliverable) => {
            const seq = deliverable.week_number ?? deliverable.order_index + 1;
            const isCurrent = currentDeliverable?.id === deliverable.id && quest.status === "active";
            const isFuture =
              !isCurrent &&
              currentDeliverable != null &&
              deliverable.order_index > currentDeliverable.order_index;
            const taskProgress = getDeliverableTaskProgress(deliverable);

            return (
              <div
                key={deliverable.id}
                className={cn(
                  "rounded-xl p-4 transition-all ring-1",
                  isCurrent
                    ? "bg-surface-container-lowest ring-primary/20 shadow-kinetic-sm"
                    : isFuture
                    ? "bg-surface-container-low/50 ring-outline-variant/10 opacity-60"
                    : "bg-surface-container-low ring-outline-variant/10"
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                      deliverable.status === "submitted" || deliverable.status === "verified"
                        ? "bg-success-muted text-success"
                        : isCurrent
                        ? "bg-primary-container text-primary"
                        : "bg-surface-container text-on-surface-variant"
                    )}
                  >
                    {deliverable.status === "submitted" || deliverable.status === "verified" ? (
                      <CheckCircle2 size={16} />
                    ) : isFuture ? (
                      <Lock size={14} />
                    ) : (
                      seq
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isFuture ? "text-on-surface-variant" : "text-on-surface")}>
                      {deliverable.title}
                    </p>
                    {!isFuture && taskProgress.total > 0 && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {taskProgress.completed}/{taskProgress.total} tasks done
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-on-surface-variant hidden sm:block">
                      {VERIFICATION_TYPE_LABELS[(deliverable.verification_type ?? "manual_upload") as import("@/types").VerificationType]}
                    </span>
                    <StatusBadge status={deliverable.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
