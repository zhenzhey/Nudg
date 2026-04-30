"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Sparkles, Loader2 } from "lucide-react";
import type { Deliverable, Project, Task, TaskMetadata } from "@/types";

interface FocusTaskCardProps {
  task: Task;
  deliverable: Deliverable;
  project: Project;
  taskIndex?: number;          // 1-based position of this task in the deliverable
  taskTotal?: number;          // total tasks in the deliverable
  onTaskUpdate?: (taskId: string, patch: Partial<Task>) => void;
}

function formatHourFloat(h: number): string {
  const hourInt = Math.floor(h);
  const min = Math.round((h - hourInt) * 60);
  const period = hourInt >= 12 ? "pm" : "am";
  const display = hourInt === 0 ? 12 : hourInt > 12 ? hourInt - 12 : hourInt;
  return min === 0 ? `${display}${period}` : `${display}:${String(min).padStart(2, "0")}${period}`;
}

function formatBlock(task: Task): string | null {
  if (task.scheduled_time == null) return null;
  const start = task.scheduled_time;
  const end = start + (task.estimated_hours ?? 1);
  return `${formatHourFloat(start)} – ${formatHourFloat(end)}`;
}

function formatDuration(hours: number | null): string {
  if (!hours) return "";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function FocusTaskCard({
  task,
  deliverable,
  project,
  taskIndex,
  taskTotal,
  onTaskUpdate,
}: FocusTaskCardProps) {
  const [meta, setMeta] = useState<TaskMetadata>(task.metadata ?? {});
  const [isEnriching, setIsEnriching] = useState(false);
  const enrichedFor = useRef<string | null>(null);

  useEffect(() => {
    setMeta(task.metadata ?? {});
  }, [task.metadata, task.id]);

  // Lazy enrichment: ask the server to fill metadata if missing. Dedup by task.id.
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

  const blockLabel = formatBlock(task);
  // Pre-load context the focus page renders (deliverable title, start step) via
  // URL params so the timer view can paint immediately. The page still falls
  // back to /api/tasks/[id]/enrich if start_step is absent (e.g. shared link).
  const focusParams = new URLSearchParams({
    taskId: task.id,
    title: task.title,
    deliverableId: deliverable.id,
    deliverableTitle: deliverable.title,
    projectId: project.id,
  });
  if (meta.start_step) focusParams.set("startStep", meta.start_step);
  const focusHref = `/focus?${focusParams.toString()}`;
  const positionLabel =
    taskIndex && taskTotal ? `Task ${taskIndex} of ${taskTotal} in this deliverable` : null;

  return (
    <div className="border border-atlas-border rounded-[10px] bg-atlas-panel overflow-hidden">
      {/* NEXT strip */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-atlas-border bg-atlas-panel-2">
        <span className="px-2 py-0.5 bg-atlas-ai text-white rounded text-[10px] font-mono font-semibold tracking-[0.04em]">
          NEXT
        </span>
        {positionLabel && (
          <span className="text-[11px] text-atlas-dim truncate">{positionLabel}</span>
        )}
        <div className="flex-1" />
        {blockLabel && (
          <span className="text-[11px] text-atlas-dim font-mono">{blockLabel}</span>
        )}
      </div>

      {/* Title */}
      <div className="pt-5 px-5">
        <h2 className="text-[24px] font-semibold tracking-tight leading-tight text-atlas-fg">
          {task.title}
        </h2>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 grid gap-2.5">
        {/* Start step — highlighted */}
        <div className="flex gap-3 items-start px-3 py-2.5 bg-atlas-ai-soft/50 border border-atlas-ai/40 rounded-lg">
          <div className="w-[22px] h-[22px] rounded-full bg-atlas-ai text-white grid place-items-center text-[11px] font-semibold shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-atlas-ai font-semibold tracking-[0.08em] uppercase mb-0.5">
              Start step · 90s
            </p>
            {isEnriching && !meta.start_step ? (
              <p className="flex items-center gap-1.5 text-xs text-atlas-dim">
                <Loader2 size={11} className="animate-spin" /> Generating…
              </p>
            ) : meta.start_step ? (
              <p className="text-[13px] text-atlas-fg leading-snug">{meta.start_step}</p>
            ) : (
              <p className="text-xs text-atlas-dim italic">—</p>
            )}
          </div>
        </div>

        {/* AI hint */}
        {(isEnriching || meta.ai_assist) && (
          <div className="flex gap-3 items-start px-3 py-2.5 text-atlas-dim">
            <Sparkles size={14} className="text-atlas-ai mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {isEnriching && !meta.ai_assist ? (
                <p className="flex items-center gap-1.5 text-xs">
                  <Loader2 size={11} className="animate-spin" /> Generating hint…
                </p>
              ) : (
                <p className="text-[12px] leading-snug">{meta.ai_assist}</p>
              )}
            </div>
            <Link
              href={`/projects/${project.id}?ai=${encodeURIComponent(`Help me with: ${task.title}`)}`}
              className="text-[11px] text-atlas-ai hover:underline shrink-0"
            >
              Ask
            </Link>
          </div>
        )}
      </div>

      {/* CTA row */}
      <div className="px-4 py-3 border-t border-atlas-border bg-atlas-panel-2 flex items-center gap-2">
        <Link href={focusHref} className="flex-1">
          <button className="w-full h-11 bg-atlas-fg text-atlas-bg rounded-lg font-semibold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity tracking-tight">
            <Play size={11} fill="currentColor" />
            Start focus block
            {task.estimated_hours ? ` · ${formatDuration(task.estimated_hours)}` : ""}
          </button>
        </Link>
        <button
          type="button"
          // Postpone is a placeholder per scope decision — wire to /api/tasks/.../schedule later.
          onClick={() => { /* no-op placeholder */ }}
          className="px-3.5 h-11 border border-atlas-border bg-atlas-panel rounded-lg text-atlas-dim text-[12px] hover:bg-atlas-panel-2 transition-colors"
        >
          Postpone
        </button>
      </div>
    </div>
  );
}
