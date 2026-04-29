"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Clock, CalendarDays, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { WeekCalendar, type CalendarTask } from "@/components/calendar/week-calendar";
import { formatDate } from "@/lib/utils";
import type { Deliverable, Project, Task } from "@/types";

interface LaunchViewProps {
  project: Project;
  deliverable: Deliverable;
  initialTasks: Task[];
  weekStart: string;
}

interface DraftTask {
  title: string;
  description: string;
  estimated_hours: number;
  due_date: string;
}

function emptyDraft(defaultDue: string): DraftTask {
  return { title: "", description: "", estimated_hours: 1, due_date: defaultDue };
}

export function LaunchView({ project, deliverable, initialTasks, weekStart }: LaunchViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [replanning, setReplanning] = useState(false);
  const [replanMessage, setReplanMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftTask>(() =>
    emptyDraft(deliverable.due_date ?? new Date().toISOString().slice(0, 10))
  );

  // Calendar context: convert tasks into CalendarTask shape with project/deliverable titles.
  const calendarTasks: CalendarTask[] = useMemo(
    () =>
      tasks
        .filter((t) => t.scheduled_date && t.scheduled_time != null)
        .map((t) => ({
          ...t,
          deliverable_title: deliverable.title,
          project_title: project.title,
          project_id: project.id,
        })),
    [tasks, deliverable.title, project.title, project.id]
  );

  const projectsForCalendar = useMemo<Project[]>(() => [project], [project]);

  // ── Task list operations ────────────────────────────────────────
  const updateTaskField = useCallback(
    async (id: string, patch: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    []
  );

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }, []);

  const addTask = useCallback(async () => {
    if (!draft.title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: deliverable.id,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          estimated_hours: draft.estimated_hours,
          due_date: draft.due_date,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [...prev, data.task as Task]);
        setDraft(emptyDraft(deliverable.due_date ?? new Date().toISOString().slice(0, 10)));
      }
    } finally {
      setAdding(false);
    }
  }, [draft, deliverable.id, deliverable.due_date]);

  // ── Re-plan ─────────────────────────────────────────────────────
  const handleReplan = useCallback(async () => {
    setReplanning(true);
    setReplanMessage(null);
    try {
      const res = await fetch(`/api/deliverables/${deliverable.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reschedule_all: true }),
      });
      const data = await res.json();
      if (data.tasks) {
        // Merge updated scheduled_date / scheduled_time into local state
        setTasks((prev) => {
          const updates = new Map<string, Task>(
            (data.tasks as Task[]).map((t) => [t.id, t])
          );
          return prev.map((t) => {
            const u = updates.get(t.id);
            return u ? { ...t, ...u } : t;
          });
        });
        const skipped = data.unscheduled ?? 0;
        setReplanMessage(
          skipped > 0
            ? `Scheduled ${data.scheduled} task${data.scheduled !== 1 ? "s" : ""} · ${skipped} couldn't fit`
            : `Scheduled ${data.scheduled} task${data.scheduled !== 1 ? "s" : ""}`
        );
      } else if (data.error) {
        setReplanMessage(data.error);
      }
    } catch {
      setReplanMessage("Failed to re-plan");
    } finally {
      setReplanning(false);
      setTimeout(() => setReplanMessage(null), 3500);
    }
  }, [deliverable.id]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
            <ArrowLeft size={14} />
            Dashboard
          </button>
        </Link>
        <Link href={`/projects/${project.id}`}>
          <button className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
            Project overview
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      {/* Project + deliverable header */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 mb-6 shadow-kinetic-card ring-1 ring-outline-variant/10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5">
          Launching · Deliverable 1
        </p>
        <h1 className="text-xl font-bold text-on-surface">{deliverable.title}</h1>
        {deliverable.description && (
          <p className="text-sm text-on-surface-variant mt-1">{deliverable.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-on-surface-variant">
          <span className="font-semibold text-on-surface">{project.title}</span>
          {deliverable.due_date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              Due {formatDate(deliverable.due_date)}
            </span>
          )}
          {deliverable.estimated_hours != null && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {deliverable.estimated_hours}h budget
            </span>
          )}
        </div>
      </div>

      {/* Task list */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Micro-tasks</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Edit titles, durations, or due dates. Hit <span className="font-semibold">Re-plan</span> to refit them on the calendar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {replanMessage && (
              <span className="text-xs text-on-surface-variant">{replanMessage}</span>
            )}
            <button
              onClick={handleReplan}
              disabled={replanning || tasks.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-dim disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors"
            >
              {replanning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Re-plan
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/15 overflow-hidden">
          {tasks.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant text-center">
              No tasks yet. Add one below.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  deliverableDue={deliverable.due_date ?? null}
                  onChange={(patch) => updateTaskField(task.id, patch)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </ul>
          )}

          {/* Add new task */}
          <div className="border-t border-outline-variant/15 bg-surface-container-low/40 p-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="New task title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              className="flex-1 min-w-[220px] text-sm bg-surface rounded-lg px-3 py-2 outline-none border border-outline-variant/25 focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant"
            />
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={draft.estimated_hours}
              onChange={(e) => setDraft((d) => ({ ...d, estimated_hours: Number(e.target.value) || 1 }))}
              className="w-20 text-sm bg-surface rounded-lg px-2 py-2 outline-none border border-outline-variant/25 focus:ring-2 focus:ring-primary/30"
              title="Estimated hours"
            />
            <span className="text-xs text-on-surface-variant">h</span>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
              className="text-sm bg-surface rounded-lg px-2 py-2 outline-none border border-outline-variant/25 focus:ring-2 focus:ring-primary/30"
              title="Due date (11:59 PM)"
            />
            <button
              onClick={addTask}
              disabled={!draft.title.trim() || adding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dim disabled:opacity-40 transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Calendar view */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Calendar</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Drag a block to change when you'll do it. Deadlines stay fixed.
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl border border-outline/15 shadow-card overflow-hidden flex flex-col"
          style={{ height: 640 }}
        >
          <WeekCalendar
            initialTasks={calendarTasks}
            projects={projectsForCalendar}
            currentWeekStart={weekStart}
          />
        </div>
      </section>

      {/* Footer actions */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => router.push(`/projects/${project.id}`)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-on-surface text-surface text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Done · Go to project
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Task row with inline editing ────────────────────────────────────

function TaskRow({
  task,
  deliverableDue,
  onChange,
  onDelete,
}: {
  task: Task;
  deliverableDue: string | null;
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState<number>(task.estimated_hours ?? 1);
  const [due, setDue] = useState<string>(task.due_date ?? deliverableDue ?? "");
  const [confirming, setConfirming] = useState(false);

  const commitTitle = () => {
    const v = title.trim();
    if (v && v !== task.title) onChange({ title: v });
    else if (!v) setTitle(task.title);
  };
  const commitHours = () => {
    if (hours > 0 && hours !== task.estimated_hours) onChange({ estimated_hours: hours });
  };
  const commitDue = () => {
    if (due && due !== task.due_date) onChange({ due_date: due });
  };

  return (
    <li className="flex items-start gap-3 p-3 hover:bg-surface-container-low/40 transition-colors">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="flex-1 text-sm font-medium text-on-surface bg-transparent outline-none focus:bg-surface focus:ring-2 focus:ring-primary/30 rounded-lg px-2 py-1.5"
      />
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          step="0.25"
          min="0.25"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value) || 0)}
          onBlur={commitHours}
          className="w-16 text-xs text-on-surface bg-surface-container-low rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
          title="Estimated hours"
        />
        <span className="text-[11px] text-on-surface-variant">h</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <CalendarDays size={12} className="text-on-surface-variant" />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          onBlur={commitDue}
          className="text-xs text-on-surface bg-surface-container-low rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30"
          title="Due date (11:59 PM)"
        />
      </div>
      {confirming ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onDelete}
            className="text-xs text-error font-semibold px-2 py-1 hover:bg-error/10 rounded-md"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-on-surface-variant px-2 py-1 hover:bg-surface-container rounded-md"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-error/10 transition-colors shrink-0"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}
