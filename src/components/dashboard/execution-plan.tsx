"use client";

import { useState, useMemo } from "react";
import type { Task } from "@/types";
import { Check, Calendar } from "lucide-react";

type Filter = "today" | "week" | "all";

interface ExecutionPlanProps {
  tasks: Task[];
  today: string;
  onTaskUpdate: (taskId: string, patch: Partial<Task>) => void;
}

function dayLabel(scheduledDate: string | null, today: string, tomorrow: string): string {
  if (!scheduledDate) return "Unscheduled";
  if (scheduledDate === today) return "Today";
  if (scheduledDate === tomorrow) return "Tmrw";
  const d = new Date(scheduledDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDuration(hours: number | null): string {
  if (!hours) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isoOffset(today: string, days: number): string {
  const d = new Date(today + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ExecutionPlan({ tasks, today, onTaskUpdate }: ExecutionPlanProps) {
  const [filter, setFilter] = useState<Filter>("week");
  const tomorrow = isoOffset(today, 1);
  const weekEnd = isoOffset(today, 7);

  const filtered = useMemo(() => {
    if (filter === "today") {
      return tasks.filter((t) => t.scheduled_date === today);
    }
    if (filter === "week") {
      return tasks.filter(
        (t) => t.scheduled_date != null && t.scheduled_date >= today && t.scheduled_date <= weekEnd
      );
    }
    return tasks;
  }, [tasks, filter, today, weekEnd]);

  // Sort: pending first, then by scheduled_date, then by created_at.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ad = a.status === "completed" ? 1 : 0;
      const bd = b.status === "completed" ? 1 : 0;
      if (ad !== bd) return ad - bd;
      const ax = a.scheduled_date ?? "9999-99-99";
      const bx = b.scheduled_date ?? "9999-99-99";
      if (ax !== bx) return ax.localeCompare(bx);
      return a.created_at.localeCompare(b.created_at);
    });
  }, [filtered]);

  const handleToggle = async (task: Task) => {
    const next = task.status === "completed" ? "pending" : "completed";
    onTaskUpdate(task.id, {
      status: next,
      completed_at: next === "completed" ? new Date().toISOString() : null,
    });
    try {
      await fetch(`/api/tasks/${task.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } catch {
      // Best-effort; rely on next refresh to reconcile.
    }
  };

  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-3 mb-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-atlas-dim">
          Execution plan
        </h3>
        <div className="flex-1" />
        <FilterToggle value={filter} onChange={setFilter} />
      </div>

      <div className="border border-atlas-border rounded-[10px] overflow-hidden bg-atlas-panel">
        {sorted.length === 0 ? (
          <p className="text-center text-[12px] text-atlas-dim py-8">
            {filter === "today"
              ? "No tasks scheduled for today."
              : filter === "week"
              ? "No tasks scheduled this week."
              : "No tasks yet."}
          </p>
        ) : (
          sorted.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              isFirst={i === 0}
              today={today}
              tomorrow={tomorrow}
              onToggle={() => handleToggle(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterToggle({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const options: Array<{ key: Filter; label: string }> = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "all", label: "All" },
  ];
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-atlas-panel-2 rounded-md border border-atlas-border text-[11px]">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              active ? "bg-atlas-panel text-atlas-fg shadow-sm" : "text-atlas-dim hover:text-atlas-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  isFirst,
  today,
  tomorrow,
  onToggle,
}: {
  task: Task;
  isFirst: boolean;
  today: string;
  tomorrow: string;
  onToggle: () => void;
}) {
  const done = task.status === "completed";
  const showSplitHint = !done && (task.estimated_hours ?? 0) > 2;
  const day = dayLabel(task.scheduled_date, today, tomorrow);
  const isToday = task.scheduled_date === today;

  return (
    <div
      className={`grid items-center gap-3 px-3.5 py-2.5 ${!isFirst ? "border-t border-atlas-border" : ""} ${
        done ? "opacity-50" : ""
      } ${isToday && !done ? "bg-atlas-ai-soft/30" : ""}`}
      style={{ gridTemplateColumns: "20px 1fr 80px 60px 50px" }}
    >
      <button
        onClick={onToggle}
        aria-label={done ? "Mark as pending" : "Mark as completed"}
        className={`w-3.5 h-3.5 rounded grid place-items-center transition-colors border ${
          done ? "bg-atlas-done border-atlas-done text-white" : "border-atlas-border-hi hover:border-atlas-dim bg-transparent"
        }`}
      >
        {done && <Check size={9} strokeWidth={3} />}
      </button>

      <div className="min-w-0">
        <p className={`text-[13px] font-medium text-atlas-fg truncate ${done ? "line-through" : ""}`}>
          {task.title}
        </p>
        {showSplitHint && (
          <p className="text-[11px] text-atlas-warn mt-0.5 truncate">
            + Consider splitting
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-atlas-dim font-mono">
        <Calendar size={10} />
        <span>{day}</span>
      </div>

      <span className="text-[11px] text-atlas-dim font-mono tabular-nums">
        {formatDuration(task.estimated_hours)}
      </span>

      <div className="flex justify-end">
        <SparkBars done={done} />
      </div>
    </div>
  );
}

// Decorative bar pattern at row's right edge — pure visual, no data.
function SparkBars({ done }: { done: boolean }) {
  const values = [0.4, 0.6, 0.8, 0.5, 0.3];
  return (
    <div className="flex items-end gap-px h-3.5">
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-0.5 rounded-sm ${done ? "bg-atlas-dimmer" : "bg-atlas-ai/70"}`}
          style={{ height: `${Math.max(2, v * 14)}px` }}
        />
      ))}
    </div>
  );
}
