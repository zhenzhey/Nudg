import Link from "next/link";
import { cn, getCurrentWeek, getGoalProgress, calculateStreak } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import type { Project } from "@/types";
import { ArrowRight, Flame, Calendar } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const currentWeek = getCurrentWeek(project.start_date);
  const progress = getGoalProgress(project);
  const streak = project.deliverables ? calculateStreak(project.deliverables) : 0;
  const weeksLeft = Math.max(0, project.duration_weeks - currentWeek + 1);
  const activeWeek = Math.min(currentWeek, project.duration_weeks);
  const currentDeliverable = project.deliverables?.find((d) => d.week_number === activeWeek);

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-surface rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-outline/20 transition-all cursor-pointer group animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-on-surface truncate group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            {project.description && (
              <p className="text-sm text-on-surface-variant mt-0.5 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <ArrowRight size={16} className="text-on-surface-variant group-hover:text-primary transition-colors shrink-0 mt-0.5" />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
            <span>Week {activeWeek} of {project.duration_weeks}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentDeliverable && project.status === "active" && (
          <div className="bg-surface-container rounded-xl p-3 mb-4 border border-outline/30">
            <p className="text-xs text-on-surface-variant mb-1">This week</p>
            <p className="text-sm text-on-surface font-medium line-clamp-1">
              {currentDeliverable.title}
            </p>
            <div className="mt-2">
              <StatusBadge status={currentDeliverable.status} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            {project.status === "active"
              ? weeksLeft > 0 ? `${weeksLeft}w left` : "Final week"
              : project.status === "completed" ? "Completed" : "Abandoned"}
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Flame size={12} />
              {streak} streak
            </div>
          )}
          <div className={cn("ml-auto w-2 h-2 rounded-full", project.status === "active" ? "bg-success animate-pulse" : "bg-on-surface-variant/40")} />
        </div>
      </div>
    </Link>
  );
}
