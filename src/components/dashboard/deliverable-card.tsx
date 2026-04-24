"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Square,
  Timer,
  Sparkles,
  Trash2,
  Loader2,
  Plus,
  Check,
  X,
  Info,
} from "lucide-react";
import type { Deliverable, Task, Project } from "@/types";

interface DeliverableCardProps {
  deliverable: Deliverable & { tasks: Task[] };
  project: Project;
  today: string;
  tomorrow: string;
  onTaskUpdate?: (taskId: string, patch: Partial<Task>) => void;
}

function formatDueLabel(due: string | null): { text: string; urgent: boolean } {
  if (!due) return { text: "No deadline", urgent: false };
  const d = new Date(due);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3600000);
  if (diffH < 0) return { text: "Overdue", urgent: true };
  if (diffH === 0) return { text: "Due now", urgent: true };
  if (diffH < 24) return { text: `Due in ${diffH}h`, urgent: true };
  const diffD = Math.round(diffMs / 86400000);
  if (diffD === 0) return { text: "Due today", urgent: true };
  if (diffD === 1) return { text: "Due tomorrow", urgent: false };
  return { text: `Due in ${diffD}d`, urgent: false };
}

function formatTime(hours: number | null): string {
  if (hours == null) return "";
  if (hours < 1) return `${Math.round(hours * 60)} mins`;
  if (hours === 1) return "1 hr";
  if (Number.isInteger(hours)) return `${hours} hrs`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
}

function TaskRow({
  task,
  today,
  tomorrow,
  isEstimating,
  onUpdate,
  onDelete,
  onEstimate,
}: {
  task: Task;
  today: string;
  tomorrow: string;
  isEstimating: boolean;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onEstimate: (rawInput?: string) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [isHovered, setIsHovered] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [splitHintDismissed, setSplitHintDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.status === "completed";
  const isToday = task.scheduled_date === today;
  const isTomorrow = task.scheduled_date === tomorrow;

  const toggleComplete = async () => {
    const next = isCompleted ? "pending" : "completed";
    onUpdate({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null });
    setIsPending(true);
    await fetch(`/api/tasks/${task.id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setIsPending(false);
  };

  const scheduleTask = async (date: string | null) => {
    onUpdate({ scheduled_date: date });
    await fetch(`/api/tasks/${task.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: date }),
    });
  };

  const startEdit = () => {
    setEditValue(task.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const newTitle = editValue.trim();
    if (!newTitle || newTitle === task.title) return;
    // Optimistically show the typed title and clear hours; estimate will update both
    onUpdate({ title: newTitle, estimated_hours: null });
    onEstimate(newTitle);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") { setIsEditing(false); setEditValue(task.title); }
  };

  const handleDelete = async () => {
    onDelete();
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-4 bg-surface border border-primary/30 rounded-xl">
        <button onClick={toggleComplete} className="shrink-0 text-on-surface-variant">
          {isCompleted ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
        </button>
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          className="flex-1 text-sm font-medium bg-transparent outline-none text-on-surface"
        />
        <button
          onClick={commitEdit}
          className="p-1 text-primary hover:bg-primary/10 rounded-md transition-all"
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => { setIsEditing(false); setEditValue(task.title); }}
          className="p-1 text-on-surface-variant/50 hover:bg-surface-container rounded-md transition-all"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-surface border border-outline/25 rounded-xl transition-all overflow-hidden ${
        isCompleted ? "opacity-50" : "hover:border-outline/50"
      } ${isPending ? "opacity-60" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={toggleComplete}
          className="shrink-0 text-on-surface-variant hover:text-primary transition-colors"
        >
          {isCompleted ? (
            <CheckSquare size={18} className="text-primary" />
          ) : (
            <Square size={18} />
          )}
        </button>

        {/* Title — click to edit */}
        <span
          onClick={startEdit}
          className={`flex-1 text-sm font-medium leading-snug cursor-text ${
            isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
          }`}
        >
          {task.title}
        </span>

        {/* Info icon — shows original user input when description exists */}
        {task.description && (
          <button
            onClick={() => setShowDescription((v) => !v)}
            className={`shrink-0 p-1 rounded-md transition-all ${
              showDescription
                ? "text-primary bg-primary/10"
                : "text-on-surface-variant/30 hover:text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <Info size={13} />
          </button>
        )}

        {/* Scheduling pills */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scheduleTask(isToday ? null : today)}
            className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
              isToday
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant/60 hover:text-primary hover:bg-primary/10"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => scheduleTask(isTomorrow ? null : tomorrow)}
            className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
              isTomorrow
                ? "bg-neutral/10 text-on-surface"
                : "text-on-surface-variant/60 hover:text-on-surface hover:bg-neutral/10"
            }`}
          >
            Tmrw
          </button>
        </div>

        {/* Delete icon — visible on hover */}
        <div
          className={`flex items-center shrink-0 transition-opacity duration-150 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={handleDelete}
            className="p-1 text-on-surface-variant/50 hover:text-red-500 hover:bg-red-500/8 rounded-md transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Estimated hours or loading spinner */}
        <span className="text-sm text-on-surface-variant shrink-0 min-w-[52px] text-right flex items-center justify-end">
          {isEstimating ? (
            <Loader2 size={13} className="animate-spin text-on-surface-variant/40" />
          ) : task.estimated_hours != null ? (
            formatTime(task.estimated_hours)
          ) : null}
        </span>
      </div>

      {/* Description expansion — original user input */}
      {showDescription && task.description && (
        <div className="px-4 pb-3 ml-9 text-xs text-on-surface-variant/60 leading-relaxed border-t border-outline/8 pt-2">
          {task.description}
        </div>
      )}

      {/* Split suggestion — shown when estimate > 2h and not dismissed */}
      {!isEstimating && !splitHintDismissed && task.estimated_hours != null && task.estimated_hours > 2 && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-1.5 bg-warning/6 border border-warning/15 rounded-lg">
          <span className="text-[11px] text-warning/80 flex-1 leading-snug">
            This might take a while — consider splitting into smaller steps
          </span>
          <button
            onClick={() => setSplitHintDismissed(true)}
            className="shrink-0 text-warning/50 hover:text-warning/80 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

function AddTaskRow({
  deliverableId,
  onAdd,
}: {
  deliverableId: string;
  onAdd: (task: Task) => void;
}) {
  const [value, setValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title || isCreating) return;
    setIsCreating(true);
    setValue("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverable_id: deliverableId, title }),
      });
      if (res.ok) {
        const { task } = await res.json();
        onAdd(task);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleBlur = () => {
    if (value.trim()) handleSubmit();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-dashed border-outline/20 rounded-xl hover:border-outline/40 transition-colors">
      <Plus size={16} className="shrink-0 text-on-surface-variant/30" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Add a task..."
        disabled={isCreating}
        className="flex-1 text-sm text-on-surface placeholder:text-on-surface-variant/35 bg-transparent outline-none"
      />
      {isCreating && (
        <Loader2 size={13} className="animate-spin text-on-surface-variant/40 shrink-0" />
      )}
    </div>
  );
}

export function DeliverableCard({
  deliverable,
  project,
  today,
  tomorrow,
  onTaskUpdate,
}: DeliverableCardProps) {
  const [tasks, setTasks] = useState<Task[]>(deliverable.tasks ?? []);
  const [estimatingIds, setEstimatingIds] = useState<Set<string>>(new Set());
  const [isSuggesting, setIsSuggesting] = useState(false);

  const { text: dueText, urgent } = formatDueLabel(deliverable.due_date);

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    onTaskUpdate?.(id, patch);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const estimateTask = useCallback(async (taskId: string, rawInput?: string) => {
    setEstimatingIds((prev) => new Set([...prev, taskId]));
    try {
      const res = await fetch(`/api/tasks/${taskId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawInput ? { raw_input: rawInput } : {}),
      });
      if (res.ok) {
        const { task: updated } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
      }
    } finally {
      setEstimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const handleAddTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
    estimateTask(task.id, task.title);
  };

  const handleSuggest = async (count: 1 | 3) => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    try {
      const res = await fetch(`/api/deliverables/${deliverable.id}/next-steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (res.ok) {
        const { tasks: newTasks } = await res.json();
        setTasks((prev) => [...prev, ...newTasks]);
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline/20 shadow-card overflow-hidden">
      {/* ── Top section ─────────────────────────────────── */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${urgent ? "bg-danger animate-pulse" : "bg-primary"}`} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Current Deliverable
            </span>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              urgent
                ? "bg-warning/10 text-warning"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {dueText}
          </span>
        </div>

        <h2 className="text-2xl font-black text-on-surface leading-tight mb-2">
          {deliverable.title}
        </h2>
        {deliverable.description && (
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {deliverable.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-5">
          <Link href={`/projects/${project.id}`}>
            <button className="flex items-center gap-2 bg-neutral text-on-neutral text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
              <CheckSquare size={15} />
              Submit Deliverable
            </button>
          </Link>
          <Link
            href={`/focus?deliverableId=${deliverable.id}&title=${encodeURIComponent(deliverable.title)}&projectId=${project.id}`}
          >
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/8 transition-all">
              <Timer size={15} />
              Start Focus
            </button>
          </Link>
        </div>
      </div>

      {/* ── Execution Plan ───────────────────────────────── */}
      <div className="border-t border-outline/10 px-5 pt-4 pb-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Execution Plan
          </p>
          <div className="flex items-center gap-0.5">
            {isSuggesting ? (
              <Loader2 size={12} className="animate-spin text-on-surface-variant/40 mr-1" />
            ) : (
              <Sparkles size={12} className="text-on-surface-variant/30 mr-1" />
            )}
            <button
              onClick={() => handleSuggest(1)}
              disabled={isSuggesting}
              className="text-[11px] px-2 py-0.5 rounded-md text-on-surface-variant/45 hover:text-primary hover:bg-primary/8 disabled:opacity-40 transition-all"
            >
              Next step
            </button>
            <button
              onClick={() => handleSuggest(3)}
              disabled={isSuggesting}
              className="text-[11px] px-2 py-0.5 rounded-md text-on-surface-variant/45 hover:text-primary hover:bg-primary/8 disabled:opacity-40 transition-all"
            >
              Next 3 steps
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              tomorrow={tomorrow}
              isEstimating={estimatingIds.has(task.id)}
              onUpdate={(patch) => updateTask(task.id, patch)}
              onDelete={() => deleteTask(task.id)}
              onEstimate={(rawInput) => estimateTask(task.id, rawInput)}
            />
          ))}
          <AddTaskRow deliverableId={deliverable.id} onAdd={handleAddTask} />
        </div>
      </div>
    </div>
  );
}
