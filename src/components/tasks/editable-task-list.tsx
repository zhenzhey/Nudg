"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { Check, Clock, Plus, Pencil, Trash2, X, Loader2, Sparkles } from "lucide-react";
import { useAIMode } from "@/components/layout/ai-mode-context";

interface EditableTaskListProps {
  tasks: Task[];
  deliverableId: string;
  autoGenerate?: boolean;
}

export function EditableTaskList({
  tasks: initialTasks,
  deliverableId,
  autoGenerate = false,
}: EditableTaskListProps) {
  const router = useRouter();
  const { aiOn } = useAIMode();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const triedAuto = useRef(false);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/generate-tasks`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Generation failed");
      }
      router.refresh();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (
      aiOn &&
      autoGenerate &&
      tasks.length === 0 &&
      !triedAuto.current &&
      !generating &&
      !genError
    ) {
      triedAuto.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOn, autoGenerate, tasks.length]);

  async function toggleTask(taskId: string, currentStatus: string) {
    setBusy(taskId);
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus as Task["status"],
              completed_at: newStatus === "completed" ? new Date().toISOString() : null,
            }
          : t
      )
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: currentStatus as Task["status"] } : t
        )
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit(taskId: string, patch: { title?: string; estimated_hours?: number | null }) {
    const prevSnapshot = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    setBusy(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setTasks(prevSnapshot);
    } finally {
      setBusy(null);
      setEditingId(null);
    }
  }

  async function deleteTask(taskId: string) {
    const prevSnapshot = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setBusy(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setTasks(prevSnapshot);
    } finally {
      setBusy(null);
    }
  }

  async function addTask(title: string, hours: number | null) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy("__add__");
    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: deliverableId,
          title: trimmed,
          ...(hours != null ? { estimated_hours: hours } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setTasks((prev) => [...prev, body.task as Task]);
      setAdding(false);
      router.refresh();
    } catch {
      // keep form open so user can retry
    } finally {
      setBusy(null);
    }
  }

  const completed = tasks.filter((t) => t.status === "completed").length;

  if (tasks.length === 0 && !adding) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 p-4">
        {generating ? (
          <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant py-2">
            <Loader2 size={14} className="animate-spin" />
            Generating micro-tasks…
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-on-surface-variant mb-3">
              {genError
                ? `Couldn't generate tasks: ${genError}`
                : "No micro-tasks yet."}
            </p>
            <div className="flex items-center justify-center gap-2">
              {aiOn && (
                <button
                  onClick={generate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container/40 text-primary text-xs font-semibold hover:bg-primary-container/60 transition disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  {genError ? "Try again" : "Generate with AI"}
                </button>
              )}
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition"
              >
                <Plus size={12} />
                Add manually
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          Micro-tasks
        </h4>
        <span className="text-xs text-on-surface-variant font-mono">
          {completed}/{tasks.length} done
        </span>
      </div>

      <div className="space-y-1.5">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            busy={busy === task.id}
            isEditing={editingId === task.id}
            onToggle={() => toggleTask(task.id, task.status)}
            onStartEdit={() => setEditingId(task.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(patch) => saveEdit(task.id, patch)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}

        {adding ? (
          <NewTaskRow
            onCancel={() => setAdding(false)}
            onSave={addTask}
            saving={busy === "__add__"}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl text-sm text-on-surface-variant hover:text-on-surface bg-surface-container-low/40 hover:bg-surface-container-low ring-1 ring-dashed ring-outline-variant/30 hover:ring-outline-variant/50 transition cursor-pointer"
          >
            <Plus size={14} />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  busy,
  isEditing,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: { title?: string; estimated_hours?: number | null }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState<string>(
    task.estimated_hours != null ? String(task.estimated_hours) : ""
  );

  useEffect(() => {
    if (isEditing) {
      setTitle(task.title);
      setHours(task.estimated_hours != null ? String(task.estimated_hours) : "");
    }
  }, [isEditing, task.title, task.estimated_hours]);

  if (isEditing) {
    return (
      <div className="p-3 rounded-xl bg-surface-container ring-1 ring-primary/30">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const h = hours.trim() === "" ? null : Number(hours);
              onSave({ title: title.trim(), estimated_hours: Number.isFinite(h as number) ? h : null });
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
          className="w-full bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant"
          placeholder="Task title"
        />
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container-low rounded-lg px-2 py-1">
            <Clock size={11} />
            <input
              type="number"
              step="0.25"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-12 bg-transparent outline-none text-right"
              placeholder="—"
            />
            <span>h</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={onCancelEdit}
              className="px-2 py-1 text-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const h = hours.trim() === "" ? null : Number(hours);
                onSave({ title: title.trim(), estimated_hours: Number.isFinite(h as number) ? h : null });
              }}
              disabled={!title.trim() || busy}
              className="px-2.5 py-1 text-xs rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-xl transition-all",
        task.status === "completed"
          ? "bg-success-muted ring-1 ring-success/15 opacity-70"
          : "bg-surface-container-low hover:bg-surface-container ring-1 ring-outline-variant/10 hover:ring-outline-variant/25"
      )}
    >
      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer",
          task.status === "completed"
            ? "bg-success border-success"
            : "border-outline-variant hover:border-primary"
        )}
      >
        {task.status === "completed" && (
          <Check size={11} className="text-white stroke-[3]" />
        )}
      </button>

      <button
        onClick={onStartEdit}
        className="flex-1 min-w-0 text-left cursor-text"
      >
        <p
          className={cn(
            "text-sm font-medium",
            task.status === "completed"
              ? "line-through text-on-surface-variant"
              : "text-on-surface"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-on-surface-variant mt-0.5">{task.description}</p>
        )}
      </button>

      <div className="flex items-center gap-1 shrink-0">
        {task.estimated_hours != null && (
          <div className="flex items-center gap-1 text-xs text-on-surface-variant px-1.5">
            <Clock size={11} />
            {task.estimated_hours}h
          </div>
        )}
        <button
          onClick={onStartEdit}
          aria-label="Edit task"
          className="p-1.5 rounded-md text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-surface-container-high hover:text-on-surface transition cursor-pointer"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete task"
          className="p-1.5 rounded-md text-on-surface-variant opacity-0 group-hover:opacity-100 hover:bg-error-container/30 hover:text-error transition cursor-pointer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function NewTaskRow({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: (title: string, hours: number | null) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");

  return (
    <div className="p-3 rounded-xl bg-surface-container ring-1 ring-primary/30">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const h = hours.trim() === "" ? null : Number(hours);
            onSave(title, Number.isFinite(h as number) ? h : null);
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        placeholder="What's the next small step?"
        className="w-full bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant"
      />
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-container-low rounded-lg px-2 py-1">
          <Clock size={11} />
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-12 bg-transparent outline-none text-right"
            placeholder="—"
          />
          <span>h</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high transition cursor-pointer"
          >
            <X size={12} />
          </button>
          <button
            onClick={() => {
              const h = hours.trim() === "" ? null : Number(hours);
              onSave(title, Number.isFinite(h as number) ? h : null);
            }}
            disabled={!title.trim() || saving}
            className="px-2.5 py-1 text-xs rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
