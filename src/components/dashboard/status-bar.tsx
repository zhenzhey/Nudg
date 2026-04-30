import type { Project, Deliverable } from "@/types";
import { getCurrentWeek, getDaysRemaining, getGoalProgress } from "@/lib/utils";
import { ProgressRing } from "./progress-ring";

interface StatusBarProps {
  project: Project;
  deliverable: Deliverable | null;
}

export function StatusBar({ project, deliverable }: StatusBarProps) {
  const currentWeek = getCurrentWeek(project.start_date);
  const activeWeek = Math.min(currentWeek, project.duration_weeks);
  const daysLeft = getDaysRemaining(project.start_date, activeWeek);
  const progress = getGoalProgress(project);

  return (
    <div className="px-6 py-4 border-b border-atlas-border flex items-center gap-4">
      <div className="min-w-0">
        <p className="text-[11px] text-atlas-dim tracking-[0.05em] font-mono uppercase">
          Week {activeWeek} of {project.duration_weeks}
          {daysLeft > 0 && ` · ships in ${daysLeft}d`}
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight mt-0.5 leading-snug truncate text-atlas-fg">
          {deliverable?.title ?? project.title}
        </h1>
      </div>
      <div className="flex-1" />
      <ProgressRing value={progress} size={48} stroke={4}>
        <span className="text-xs font-semibold tabular-nums text-atlas-fg">
          {progress}
          <span className="text-[8px] text-atlas-dim ml-0.5">%</span>
        </span>
      </ProgressRing>
    </div>
  );
}
