import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/badge";
import {
  formatDate,
  getGoalProgress,
  calculateStreak,
} from "@/lib/utils";
import type { Goal, Deliverable } from "@/types";
import { CheckCircle2, Flame, Target, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goals } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allGoals = (goals ?? []) as Goal[];
  const allDeliverables = allGoals.flatMap((g) => g.deliverables ?? []);
  const submitted = allDeliverables.filter(
    (d) => d.status === "submitted" || d.status === "verified"
  );
  const missed = allDeliverables.filter((d) => d.status === "missed");
  const streak = calculateStreak(allDeliverables);
  const completedGoals = allGoals.filter((g) => g.status === "completed");

  // Submitted deliverables sorted by submission date (most recent first)
  const submittedSorted = [...submitted].sort((a, b) => {
    if (!a.submitted_at || !b.submitted_at) return 0;
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  // Build a map from deliverable id to goal
  const deliverableGoalMap = new Map<string, Goal>();
  allGoals.forEach((g) => {
    (g.deliverables ?? []).forEach((d) => {
      deliverableGoalMap.set(d.id, g);
    });
  });

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Your progress</h1>
      <p className="text-text-muted mb-8">
        Every deliverable you submit is a proof of work. This is your track record.
      </p>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-success">{submitted.length}</div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={11} />
            Shipped
          </div>
        </div>
        <div className="card text-center">
          <div className={cn("text-2xl font-bold", streak > 0 ? "text-warning" : "text-text-primary")}>
            {streak}
          </div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <Flame size={11} />
            Week streak
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-light">{completedGoals.length}</div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <Target size={11} />
            Goals done
          </div>
        </div>
        <div className="card text-center">
          <div className={cn("text-2xl font-bold", missed.length > 0 ? "text-danger" : "text-text-primary")}>
            {missed.length}
          </div>
          <div className="text-xs text-text-muted mt-1">Missed</div>
        </div>
      </div>

      {/* Goal progress cards */}
      {allGoals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Goals
          </h2>
          <div className="space-y-4">
            {allGoals.map((goal) => {
              const progress = getGoalProgress(goal);
              const goalSubmitted = (goal.deliverables ?? []).filter(
                (d: Deliverable) => d.status === "submitted" || d.status === "verified"
              ).length;

              return (
                <Link key={goal.id} href={`/goals/${goal.id}`}>
                  <div className="card-hover">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-medium text-text-primary">{goal.title}</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          Started {formatDate(goal.start_date)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-md font-medium",
                          goal.status === "active"
                            ? "bg-primary-muted text-primary-light"
                            : goal.status === "completed"
                            ? "bg-success-muted text-success"
                            : "bg-surface-3 text-text-muted"
                        )}
                      >
                        {goal.status}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>{goalSubmitted} / {goal.duration_weeks} weeks shipped</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={cn(
                            "progress-fill",
                            progress === 100
                              ? "bg-success"
                              : "bg-gradient-to-r from-primary to-accent"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Week dots */}
                    <div className="flex gap-1.5 flex-wrap mt-3">
                      {(goal.deliverables ?? []).map((d: Deliverable) => (
                        <div
                          key={d.id}
                          title={`Week ${d.week_number}: ${d.title}`}
                          className={cn(
                            "w-5 h-5 rounded-md",
                            d.status === "submitted" || d.status === "verified"
                              ? "bg-success"
                              : d.status === "missed"
                              ? "bg-danger/50"
                              : "bg-surface-3 border border-border"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Shipped deliverables feed */}
      {submittedSorted.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Shipped deliverables
          </h2>
          <div className="space-y-3">
            {submittedSorted.map((d) => {
              const parentGoal = deliverableGoalMap.get(d.id);
              return (
                <div
                  key={d.id}
                  className="bg-surface border border-border rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-muted rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{d.title}</p>
                      {parentGoal && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {parentGoal.title} · Week {d.week_number}
                        </p>
                      )}
                      {d.submission_url && (
                        <a
                          href={d.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-light hover:text-primary mt-1.5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={11} />
                          View submission
                        </a>
                      )}
                      {d.submission_notes && (
                        <p className="text-xs text-text-muted mt-1 italic">
                          &ldquo;{d.submission_notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={d.status} />
                      {d.submitted_at && (
                        <p className="text-xs text-text-muted mt-1.5">
                          {formatDate(d.submitted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <p className="text-text-muted text-sm">
            No deliverables submitted yet. Start shipping and they&apos;ll appear here.
          </p>
          <Link href="/goals/new">
            <button className="mt-4 text-sm text-primary-light hover:text-primary transition-colors">
              Create a goal →
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
