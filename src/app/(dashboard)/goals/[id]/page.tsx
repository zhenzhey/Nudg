import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/tasks/task-list";
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
import type { Goal, Deliverable } from "@/types";
import { ArrowLeft, Flame, CheckCircle2, Lock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("title")
    .eq("id", id)
    .single();
  return { title: data?.title ?? "Goal" };
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goal, error } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !goal) notFound();

  // Sort deliverables and tasks
  goal.deliverables?.sort(
    (a: Deliverable, b: Deliverable) => a.week_number - b.week_number
  );
  goal.deliverables?.forEach((d: Deliverable) => {
    d.tasks?.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  const currentWeek = getCurrentWeek(goal.start_date);
  const activeWeek = Math.min(currentWeek, goal.duration_weeks);
  const progress = getGoalProgress(goal as Goal);
  const streak = calculateStreak(goal.deliverables ?? []);
  const daysLeft = getDaysRemaining(goal.start_date, activeWeek);

  const currentDeliverable = goal.deliverables?.find(
    (d: Deliverable) => d.week_number === activeWeek
  );

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      {/* Back */}
      <Link href="/dashboard">
        <button className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors">
          <ArrowLeft size={14} />
          Dashboard
        </button>
      </Link>

      {/* Goal header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">{goal.title}</h1>
            {goal.description && (
              <p className="text-sm text-text-muted mt-1">{goal.description}</p>
            )}
          </div>
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full mt-2 shrink-0",
              goal.status === "active" ? "bg-success animate-pulse" : "bg-text-muted"
            )}
          />
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>
              Week {activeWeek} of {goal.duration_weeks}
            </span>
            <span>{progress}% complete</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-primary to-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            Started {formatDate(goal.start_date)}
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Flame size={12} />
              {streak} week streak
            </div>
          )}
          {goal.status === "active" && daysLeft > 0 && (
            <div className={cn("flex items-center gap-1 ml-auto", daysLeft <= 2 && "text-danger")}>
              <span>{daysLeft}d until week ends</span>
            </div>
          )}
        </div>
      </div>

      {/* Current week — highlighted */}
      {currentDeliverable && goal.status === "active" && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            This week
          </h2>

          <div className="bg-surface border border-primary/30 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-xs text-primary-light font-mono mb-1.5">
                  Week {currentDeliverable.week_number}
                </div>
                <h3 className="text-lg font-bold text-text-primary">
                  {currentDeliverable.title}
                </h3>
                {currentDeliverable.description && (
                  <p className="text-sm text-text-muted mt-1">
                    {currentDeliverable.description}
                  </p>
                )}
              </div>
              <StatusBadge status={currentDeliverable.status} />
            </div>

            {/* Task progress */}
            {currentDeliverable.tasks && currentDeliverable.tasks.length > 0 && (
              <div className="mb-6">
                <TaskList
                  tasks={currentDeliverable.tasks}
                  deliverableId={currentDeliverable.id}
                />
              </div>
            )}

            {/* Submission */}
            <SubmissionForm
              deliverable={currentDeliverable as Deliverable}
              goalId={goal.id}
            />
          </div>
        </div>
      )}

      {/* All weeks timeline */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Full plan
        </h2>

        <div className="space-y-3">
          {(goal.deliverables ?? []).map((deliverable: Deliverable) => {
            const isCurrent = deliverable.week_number === activeWeek && goal.status === "active";
            const isFuture = deliverable.week_number > activeWeek;
            const taskProgress = getDeliverableTaskProgress(deliverable);

            return (
              <div
                key={deliverable.id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isCurrent
                    ? "bg-surface border-primary/30"
                    : isFuture
                    ? "bg-surface border-border opacity-60"
                    : "bg-surface-2 border-border"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Week indicator */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono",
                      deliverable.status === "submitted" || deliverable.status === "verified"
                        ? "bg-success-muted text-success"
                        : isCurrent
                        ? "bg-primary-muted text-primary-light"
                        : "bg-surface-3 text-text-muted"
                    )}
                  >
                    {deliverable.status === "submitted" ||
                    deliverable.status === "verified" ? (
                      <CheckCircle2 size={16} />
                    ) : isFuture ? (
                      <Lock size={14} />
                    ) : (
                      `W${deliverable.week_number}`
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isFuture ? "text-text-muted" : "text-text-primary"
                      )}
                    >
                      {deliverable.title}
                    </p>
                    {!isFuture && taskProgress.total > 0 && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {taskProgress.completed}/{taskProgress.total} tasks done
                      </p>
                    )}
                  </div>

                  <StatusBadge status={deliverable.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
