"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Timer, Zap, Clock, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import type { Deliverable, Project, Task, TaskMetadata } from "@/types";

interface FocusTaskCardProps {
  task: Task;
  deliverable: Deliverable;
  project: Project;
  onTaskUpdate?: (taskId: string, patch: Partial<Task>) => void;
}

function formatHourFloat(h: number): string {
  const hourInt = Math.floor(h);
  const min = Math.round((h - hourInt) * 60);
  const period = hourInt >= 12 ? "pm" : "am";
  const display = hourInt === 0 ? 12 : hourInt > 12 ? hourInt - 12 : hourInt;
  return min === 0 ? `${display}${period}` : `${display}:${String(min).padStart(2, "0")}${period}`;
}

function formatBlock(task: Task): string {
  if (task.scheduled_time == null && task.scheduled_date == null) {
    return "Not yet on the calendar";
  }
  const dateLabel = (() => {
    if (!task.scheduled_date) return "";
    const today = new Date().toISOString().slice(0, 10);
    const tmrwDate = new Date();
    tmrwDate.setDate(tmrwDate.getDate() + 1);
    const tmrw = tmrwDate.toISOString().slice(0, 10);
    if (task.scheduled_date === today) return "Today";
    if (task.scheduled_date === tmrw) return "Tomorrow";
    return new Date(task.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  })();
  if (task.scheduled_time == null) return dateLabel;
  const start = task.scheduled_time;
  const end = start + (task.estimated_hours ?? 1);
  return `${dateLabel} · ${formatHourFloat(start)}–${formatHourFloat(end)}`;
}

function formatDeliverableDue(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays}d`;
}

export function FocusTaskCard({ task, deliverable, project, onTaskUpdate }: FocusTaskCardProps) {
  const [meta, setMeta] = useState<TaskMetadata>(task.metadata ?? {});
  const [isEnriching, setIsEnriching] = useState(false);
  const enrichedFor = useRef<string | null>(null);

  useEffect(() => {
    setMeta(task.metadata ?? {});
  }, [task.metadata, task.id]);

  // Lazy enrichment: if metadata is missing, ask the server to fill it in once.
  // We dedupe with `enrichedFor` so re-renders never re-trigger the fetch, and
  // we always clear the spinner in `finally` (no `cancelled` gate — flipping
  // that on cleanup would strand the spinner forever).
  useEffect(() => {
    const hasBoth = meta.start_step && meta.ai_assist;
    if (hasBoth) return;
    if (enrichedFor.current === task.id) return;
    enrichedFor.current = task.id;
    setIsEnriching(true);
    fetch(`/api/tasks/${task.id}/enrich`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          const detail = await r.json().catch(() => null);
          console.warn("[focus-task] enrich failed", r.status, detail);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.task?.metadata) return;
        setMeta(data.task.metadata);
        onTaskUpdate?.(task.id, { metadata: data.task.metadata });
      })
      .finally(() => setIsEnriching(false));
  }, [task.id, meta.start_step, meta.ai_assist, onTaskUpdate]);

  const dueLabel = formatDeliverableDue(deliverable.due_date);
  const blockLabel = formatBlock(task);
  const focusHref = `/focus?taskId=${task.id}&title=${encodeURIComponent(task.title)}&deliverableId=${deliverable.id}&projectId=${project.id}`;

  return (
    <div className="bg-surface rounded-2xl border border-outline/20 shadow-card overflow-hidden">
      {/* ── Deliverable strip (compact) ───────────────── */}
      <Link
        href={`/projects/${project.id}`}
        className="flex items-center gap-2 px-5 py-2.5 border-b border-outline/10 bg-surface-container/40 hover:bg-surface-container/70 transition-colors group"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
          Current Deliverable
        </span>
        <span className="text-xs font-semibold text-on-surface truncate flex-1">
          {deliverable.title}
        </span>
        {dueLabel && (
          <span className="text-[10px] text-on-surface-variant shrink-0">{dueLabel}</span>
        )}
        <ChevronRight
          size={12}
          className="text-on-surface-variant/40 shrink-0 group-hover:text-on-surface-variant transition-colors"
        />
      </Link>

      {/* ── Focus heading ─────────────────────────────── */}
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
          Up Next
        </p>
        <h2 className="text-2xl font-black text-on-surface leading-tight">
          {task.title}
        </h2>
        {task.description && (
          <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
            {task.description}
          </p>
        )}

        {/* ── Detail rows ────────────────────────────── */}
        <div className="mt-5 space-y-2.5">
          <DetailRow
            icon={<Zap size={14} className="text-warning" />}
            label="Start step"
            value={meta.start_step}
            isLoading={isEnriching && !meta.start_step}
          />
          <DetailRow
            icon={<Clock size={14} className="text-primary" />}
            label="Protected block"
            value={blockLabel}
            muted={task.scheduled_time == null}
          />
          <DetailRow
            icon={<Sparkles size={14} className="text-primary" />}
            label="What AI can help"
            value={meta.ai_assist}
            isLoading={isEnriching && !meta.ai_assist}
          />
        </div>

        {/* ── CTA ────────────────────────────────────── */}
        <Link href={focusHref} className="block mt-5">
          <button className="w-full flex items-center justify-center gap-2 bg-neutral text-on-neutral text-sm font-semibold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
            <Timer size={15} />
            Start Focus Block
          </button>
        </Link>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLoading,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined | null;
  isLoading?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5 bg-surface-container/50 rounded-xl border border-outline/10">
      <div className="w-6 h-6 rounded-md bg-surface flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">
          {label}
        </p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
            <Loader2 size={11} className="animate-spin" />
            <span>Generating…</span>
          </div>
        ) : value ? (
          <p
            className={`text-sm leading-snug ${
              muted ? "text-on-surface-variant" : "text-on-surface"
            }`}
          >
            {value}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant/50 italic">—</p>
        )}
      </div>
    </div>
  );
}
