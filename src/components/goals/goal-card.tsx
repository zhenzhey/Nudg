import Link from "next/link";
import { cn, getCurrentWeek, getGoalProgress, calculateStreak } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import type { Goal } from "@/types";
import { ArrowRight, Flame, Calendar } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const currentWeek = getCurrentWeek(goal.start_date);
  const progress = getGoalProgress(goal);
  const streak = goal.deliverables ? calculateStreak(goal.deliverables) : 0;
  const weeksLeft = Math.max(0, goal.duration_weeks - currentWeek + 1);
  const activeWeek = Math.min(currentWeek, goal.duration_weeks);
  const currentDeliverable = goal.deliverables?.find(
    (d) => d.week_number === activeWeek
  );

  return (
    <Link href={`/goals/${goal.id}`}>
      <div className="card-hover group cursor-pointer animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate group-hover:text-primary-light transition-colors">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-sm text-text-muted mt-0.5 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
          <ArrowRight
            size={16}
            className="text-text-muted group-hover:text-primary transition-colors shrink-0 mt-0.5"
          />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
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

        {/* Current deliverable */}
        {currentDeliverable && goal.status === "active" && (
          <div className="bg-surface-3 rounded-lg p-3 mb-4 border border-border">
            <p className="text-xs text-text-muted mb-1">This week</p>
            <p className="text-sm text-text-primary font-medium line-clamp-1">
              {currentDeliverable.title}
            </p>
            <div className="mt-2">
              <StatusBadge status={currentDeliverable.status} />
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>
              {goal.status === "active"
                ? weeksLeft > 0
                  ? `${weeksLeft} week${weeksLeft === 1 ? "" : "s"} left`
                  : "Final week"
                : goal.status === "completed"
                ? "Completed"
                : "Abandoned"}
            </span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Flame size={12} />
              <span>{streak} week streak</span>
            </div>
          )}
          <div
            className={cn(
              "ml-auto w-2 h-2 rounded-full",
              goal.status === "active" ? "bg-success animate-pulse" : "bg-text-muted"
            )}
          />
        </div>
      </div>
    </Link>
  );
}
