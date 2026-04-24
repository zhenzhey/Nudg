"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Sparkles, X, Trash2, Clock, Pencil } from "lucide-react";
import type { Task, Project } from "@/types";

const HOUR_HEIGHT = 48;
const TOTAL_HOURS = 24;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i);
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface CalendarTask extends Task {
  deliverable_title?: string | null;
  project_title?: string | null;
  project_id?: string | null;
}

interface WeekCalendarProps {
  initialTasks: CalendarTask[];
  projects: Project[];
  currentWeekStart: string;
}

interface SlotClick {
  date: string;
  hour: number;
  x: number; // viewport x for positioning dialog
  y: number; // viewport y for positioning dialog
}

// ── Helpers ───────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function formatTime(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${mins.toString().padStart(2, "0")}${ampm}`;
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const s = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

// ── Task Block ────────────────────────────────────────────────────

function TaskBlock({
  task,
  onTaskClick,
}: {
  task: CalendarTask;
  onTaskClick: (task: CalendarTask, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const top = (task.scheduled_time ?? 9) * HOUR_HEIGHT;
  const dur = task.estimated_hours ?? 1;
  const height = Math.max(dur * HOUR_HEIGHT - 3, 22);
  const isStandalone = !task.deliverable_id;
  const color = isStandalone ? "#6C7791" : "#5E6AD2";

  return (
    <div
      ref={ref}
      className={`absolute overflow-hidden cursor-pointer select-none z-10 rounded-lg px-2 py-1.5 ${
        task.status === "completed" ? "opacity-50" : ""
      }`}
      // Use inline style for all position/color — avoids Tailwind CSS grid quirks with right-N
      style={{
        top,
        height,
        left: 4,
        right: 4,
        backgroundColor: isStandalone ? "rgba(108,119,145,0.16)" : "rgba(94,106,210,0.18)",
        border: `1px solid ${isStandalone ? "rgba(108,119,145,0.30)" : "rgba(94,106,210,0.30)"}`,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (ref.current) onTaskClick(task, ref.current.getBoundingClientRect());
      }}
    >
      <p
        className={`font-semibold truncate leading-tight ${isStandalone ? "text-tertiary" : "text-primary-dim"}`}
        style={{ fontSize: height < 28 ? 10 : 11 }}
      >
        {task.title}
      </p>
      {height > 36 && task.project_title && (
        <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{task.project_title}</p>
      )}
      {height > 36 && (
        <p className="text-[10px]" style={{ color: "rgba(108,119,145,0.8)" }}>
          {formatTime(task.scheduled_time ?? 9)} · {dur}h
        </p>
      )}
    </div>
  );
}

// ── Now Line (full-width, rendered outside grid cells) ────────────

function NowLineOverlay() {
  const [topPx, setTopPx] = useState(() => {
    const n = new Date();
    return (n.getHours() + n.getMinutes() / 60) * HOUR_HEIGHT;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setTopPx((n.getHours() + n.getMinutes() / 60) * HOUR_HEIGHT);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: topPx, left: 48, right: 0, zIndex: 25 }}
    >
      {/* dot */}
      <div
        className="absolute rounded-full"
        style={{ top: -4, left: -5, width: 10, height: 10, backgroundColor: "#5E6AD2" }}
      />
      {/* line */}
      <div style={{ height: 2, backgroundColor: "#5E6AD2" }} />
    </div>
  );
}

// ── Day Column ────────────────────────────────────────────────────

function DayColumn({
  date, tasks, isToday, onSlotClick, onTaskClick,
}: {
  date: string;
  tasks: CalendarTask[];
  isToday: boolean;
  onSlotClick: (date: string, hour: number, x: number, y: number) => void;
  onTaskClick: (task: CalendarTask, rect: DOMRect) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = Math.max(0, Math.min(23.5, Math.round((e.clientY - rect.top) / HOUR_HEIGHT * 2) / 2));
    onSlotClick(date, hour, e.clientX, e.clientY);
  };

  return (
    <div
      className={`relative border-l border-outline/10 cursor-cell ${isToday ? "bg-primary/[0.025]" : ""}`}
      style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      onClick={handleClick}
    >
      {tasks.map((t) => <TaskBlock key={t.id} task={t} onTaskClick={onTaskClick} />)}
    </div>
  );
}

// ── Task Edit Popover ─────────────────────────────────────────────

function TaskPopover({
  task, blockRect, onClose, onUpdate, onUnschedule,
}: {
  task: CalendarTask;
  blockRect: DOMRect;
  onClose: () => void;
  onUpdate: (patch: Partial<CalendarTask>) => void;
  onUnschedule: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description ?? "");
  const [startHour, setStartHour] = useState(task.scheduled_time ?? 9);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const popW = 292;
  const popH = 310;
  const gutter = 8;
  const fitsRight = blockRect.right + popW + gutter < window.innerWidth;
  const x = fitsRight ? blockRect.right + gutter : blockRect.left - popW - gutter;
  const y = Math.max(gutter, Math.min(blockRect.top, window.innerHeight - popH - gutter));

  const saveTitle = useCallback(() => {
    setEditingTitle(false);
    if (title.trim() && title.trim() !== task.title) onUpdate({ title: title.trim() });
  }, [title, task.title, onUpdate]);

  const saveDesc = () => {
    const d = description.trim() || null;
    if (d !== task.description) onUpdate({ description: d });
  };

  const handleStartChange = (val: number) => {
    setStartHour(val);
    onUpdate({ scheduled_time: val });
  };

  const timeOptions = Array.from({ length: 48 }, (_, i) => i * 0.5);

  return (
    <div
      ref={ref}
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{
        position: "fixed",
        zIndex: 9999,
        left: x,
        top: y,
        width: popW,
        backgroundColor: "#ffffff",
        border: "1.5px solid rgba(94,106,210,0.55)",
        boxShadow: "0 4px 16px rgba(15,23,42,0.12), 0 16px 48px rgba(15,23,42,0.22)",
      }}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        {editingTitle ? (
          <input
            ref={inputRef}
            className="flex-1 text-sm font-semibold text-on-surface bg-transparent outline-none border-b-2 border-primary pb-0.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false); }
            }}
          />
        ) : (
          <button
            className="flex-1 text-sm font-semibold text-on-surface text-left truncate hover:text-primary transition-colors"
            onClick={() => {
              setEditingTitle(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            {title}
          </button>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {!editingTitle && (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => inputRef.current?.focus(), 0); }}
              className="text-on-surface-variant hover:text-primary transition-colors p-0.5 rounded"
            >
              <Pencil size={11} />
            </button>
          )}
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-0.5 rounded">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Project context */}
      {task.project_title && (
        <p className="text-[11px] text-on-surface-variant truncate -mt-1.5">
          {task.project_title}{task.deliverable_title ? ` · ${task.deliverable_title}` : ""}
        </p>
      )}

      {/* Time */}
      <div className="flex items-center gap-2">
        <Clock size={11} className="text-on-surface-variant shrink-0" />
        <select
          value={startHour}
          onChange={(e) => handleStartChange(Number(e.target.value))}
          className="text-xs text-on-surface bg-surface-container rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/40 border border-outline/20"
        >
          {timeOptions.map((h) => (
            <option key={h} value={h}>{formatTime(h)}</option>
          ))}
        </select>
        <span className="text-xs text-on-surface-variant">→</span>
        <span className="text-xs text-on-surface-variant">
          {formatTime(startHour + (task.estimated_hours ?? 1))}
        </span>
      </div>

      {/* Description */}
      <textarea
        className="w-full text-xs text-on-surface bg-surface-container rounded-xl px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant border border-outline/15"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={saveDesc}
        placeholder="Add description…"
      />

      {/* Remove / delete */}
      {confirmRemove ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant flex-1">
            {task.deliverable_id ? "Remove from calendar?" : "Delete this task?"}
          </span>
          <button onClick={onUnschedule} className="text-xs text-error font-semibold hover:underline">
            {task.deliverable_id ? "Remove" : "Delete"}
          </button>
          <button onClick={() => setConfirmRemove(false)} className="text-xs text-on-surface-variant hover:underline">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmRemove(true)}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors self-start"
        >
          <Trash2 size={11} />
          {task.deliverable_id ? "Remove from calendar" : "Delete task"}
        </button>
      )}
    </div>
  );
}

// ── New Task Dialog ───────────────────────────────────────────────

function NewTaskDialog({
  slot, onClose, onCreate,
}: {
  slot: SlotClick;
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Position near click, staying within viewport
  const popW = 300;
  const popH = 230;
  const gutter = 8;
  const x = Math.min(slot.x + 10, window.innerWidth - popW - gutter);
  const y = Math.min(slot.y - 10, window.innerHeight - popH - gutter);

  useEffect(() => {
    inputRef.current?.focus();
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const dateLabel = new Date(slot.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    // Backdrop: catches outside clicks and stops them from bubbling to calendar
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      onMouseDown={(e) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        ref={ref}
        className="absolute flex flex-col gap-3 p-4 rounded-2xl"
        style={{
          left: x,
          top: y,
          width: popW,
          backgroundColor: "#ffffff",
          zIndex: 9999,
          border: "1.5px solid rgba(94,106,210,0.55)",
          boxShadow: "0 4px 16px rgba(15,23,42,0.12), 0 16px 48px rgba(15,23,42,0.22)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">New Task</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X size={13} />
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant -mt-1">
          {dateLabel} at {formatTime(slot.hour)}
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (title.trim()) onCreate(title.trim(), description.trim()); }}
          className="flex flex-col gap-2.5"
        >
          <input
            ref={inputRef}
            className="w-full text-sm text-on-surface bg-surface-container rounded-xl px-3 py-2.5 border border-outline/15 outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-on-surface-variant"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full text-xs text-on-surface bg-surface-container rounded-xl px-3 py-2 border border-outline/15 outline-none resize-none focus:ring-2 focus:ring-primary/25 placeholder:text-on-surface-variant"
            placeholder="Description (optional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2 mt-0.5">
            <button type="button" onClick={onClose} className="flex-1 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-xl hover:bg-primary-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plan My Week ──────────────────────────────────────────────────

function PlanWeekButton({
  projects, weekStart, onTasksAdded,
}: {
  projects: Project[];
  weekStart: string;
  onTasksAdded: (tasks: CalendarTask[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handlePlan = async (projectId: string) => {
    setLoading(projectId);
    setResult(null);
    try {
      const res = await fetch("/api/calendar/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, week_start: weekStart }),
      });
      const data = await res.json();
      if (data.tasks?.length) {
        onTasksAdded(data.tasks as CalendarTask[]);
        setResult(`Scheduled ${data.scheduled} task${data.scheduled !== 1 ? "s" : ""}`);
      } else {
        setResult(data.message ?? "Nothing to schedule");
      }
    } catch {
      setResult("Failed");
    } finally {
      setLoading(null);
      setTimeout(() => { setOpen(false); setResult(null); }, 1800);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-xl text-sm font-medium text-on-surface transition-colors border border-outline/20"
      >
        <Sparkles size={14} className="text-primary" />
        Plan my week
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl p-2 z-[200] w-56 bg-white"
          style={{
            border: "1.5px solid rgba(94,106,210,0.55)",
            boxShadow: "0 4px 16px rgba(15,23,42,0.12), 0 16px 48px rgba(15,23,42,0.22)",
          }}
        >
          {result ? (
            <p className="text-xs text-on-surface-variant px-3 py-2 text-center">{result}</p>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2 pb-2">
                Choose project
              </p>
              {projects.length === 0 ? (
                <p className="text-xs text-on-surface-variant px-2 py-1">No active projects</p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handlePlan(project.id)}
                    disabled={loading !== null}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2.5 disabled:opacity-60"
                  >
                    {loading === project.id ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <span className="truncate text-sm">{project.title}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main WeekCalendar ─────────────────────────────────────────────

export function WeekCalendar({ initialTasks, projects, currentWeekStart }: WeekCalendarProps) {
  const today = isoDate(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState<CalendarTask[]>(initialTasks);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [selectedTaskRect, setSelectedTaskRect] = useState<DOMRect | null>(null);
  const [newTaskSlot, setNewTaskSlot] = useState<SlotClick | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStartDate = addDays(getMondayOf(new Date(currentWeekStart + "T00:00:00")), weekOffset * 7);
  const weekStartStr = isoDate(weekStartDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStartDate, i)));
  const isCurrentWeek = weekOffset === 0;

  // Scroll to current time on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const now = new Date();
      el.scrollTop = Math.max(0, now.getHours() - 1) * HOUR_HEIGHT;
    });
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tasks for other weeks
  useEffect(() => {
    if (weekOffset === 0) { setTasks(initialTasks); return; }
    setIsLoadingWeek(true);
    fetch(`/api/calendar/tasks?week_start=${weekStartStr}`)
      .then((r) => r.json())
      .then((d) => { if (d.tasks) setTasks(d.tasks); })
      .finally(() => setIsLoadingWeek(false));
  }, [weekOffset, weekStartStr, initialTasks]);

  const tasksForDay = useCallback(
    (date: string) => tasks.filter((t) => t.scheduled_date === date && t.scheduled_time != null),
    [tasks]
  );

  const handleTaskClick = (task: CalendarTask, rect: DOMRect) => {
    setSelectedTask(task);
    setSelectedTaskRect(rect);
  };

  // Don't open new task dialog if the click is closing the popover
  const handleSlotClick = useCallback((date: string, hour: number, x: number, y: number) => {
    if (selectedTask) return; // popover's backdrop handles the close
    setNewTaskSlot({ date, hour, x, y });
  }, [selectedTask]);

  const handleTaskUpdate = useCallback(async (patch: Partial<CalendarTask>) => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setSelectedTask((prev) => (prev ? { ...prev, ...patch } : null));

    if ("title" in patch || "description" in patch) {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: patch.title, description: patch.description }),
      });
    } else if ("scheduled_time" in patch) {
      await fetch(`/api/tasks/${id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: selectedTask.scheduled_date, scheduled_time: patch.scheduled_time }),
      });
    }
  }, [selectedTask]);

  const handleTaskUnschedule = useCallback(async () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    const isStandalone = !selectedTask.deliverable_id;
    setSelectedTask(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (isStandalone) {
      // Standalone calendar task → delete it entirely
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    } else {
      // Project task → unschedule only (keeps it in the deliverable's task list)
      await fetch(`/api/tasks/${id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: null, scheduled_time: null }),
      });
    }
  }, [selectedTask]);

  const handleCreateTask = async (title: string, description: string) => {
    if (!newTaskSlot) return;
    const slot = newTaskSlot;
    setNewTaskSlot(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        scheduled_date: slot.date,
        scheduled_time: slot.hour,
        estimated_hours: 1,
      }),
    });
    const data = await res.json();
    if (data.task) setTasks((prev) => [...prev, data.task as CalendarTask]);
  };

  const handlePlanWeekTasks = (newTasks: CalendarTask[]) => {
    setTasks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      return [
        ...prev.map((t) => { const u = newTasks.find((n) => n.id === t.id); return u ? { ...t, ...u } : t; }),
        ...newTasks.filter((t) => !existingIds.has(t.id)),
      ];
    });
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl overflow-hidden">
      {/* Nav header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline/10 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-black text-on-surface tracking-tight">Calendar</h1>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${isCurrentWeek ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {isCurrentWeek ? "This week" : formatWeekRange(weekStartDate)}
            </button>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          {!isCurrentWeek && (
            <span className="text-xs text-on-surface-variant hidden md:block">{formatWeekRange(weekStartDate)}</span>
          )}
        </div>
        <PlanWeekButton projects={projects} weekStart={weekStartStr} onTasksAdded={handlePlanWeekTasks} />
      </div>

      {/* Day headers — same 48px+7×1fr grid so columns align with the time grid */}
      <div
        className="grid border-b border-outline/10 shrink-0"
        style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
      >
        <div className="bg-surface" />
        {weekDates.map((date, i) => {
          const d = new Date(date + "T00:00:00");
          const isToday = date === today;
          return (
            <div key={date} className={`py-2 text-center border-l border-outline/10 ${isToday ? "bg-primary/[0.04]" : ""}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-on-surface-variant"}`}>
                {DAY_NAMES[i]}
              </p>
              <p className={`text-base font-black leading-none mt-0.5 ${isToday ? "text-primary" : "text-on-surface"}`}>
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto relative isolate">
        {isLoadingWeek && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-30 pointer-events-none">
            <span className="text-sm text-on-surface-variant">Loading…</span>
          </div>
        )}
        <div
          className="grid"
          style={{ gridTemplateColumns: "48px repeat(7, 1fr)", height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Time labels */}
          <div className="relative bg-surface" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {HOURS.map((h) =>
              h < TOTAL_HOURS ? (
                <div key={h} className="absolute flex justify-end pr-2" style={{ top: h * HOUR_HEIGHT - 7, right: 0, left: 0 }}>
                  <span className="text-[10px] select-none tabular-nums" style={{ color: "rgba(108,119,145,0.7)" }}>
                    {formatHour(h)}
                  </span>
                </div>
              ) : null
            )}
          </div>

          {/* 7 day columns */}
          {weekDates.map((date) => (
            <DayColumn
              key={date}
              date={date}
              tasks={tasksForDay(date)}
              isToday={date === today}
              onSlotClick={handleSlotClick}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        {/* Now line — spans all 7 columns */}
        <NowLineOverlay />

        {/* Hour grid lines — positioned over the 7-column area */}
        <div
          className="absolute pointer-events-none"
          style={{ top: 0, left: 48, right: 0, height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0"
              style={{
                top: h * HOUR_HEIGHT,
                height: 1,
                backgroundColor: h % 2 === 0 ? "rgba(203,208,224,0.18)" : "rgba(203,208,224,0.09)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Task edit popover — rendered via portal so overflow-hidden can't clip it */}
      {selectedTask && selectedTaskRect && typeof document !== "undefined" && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={(e) => { e.stopPropagation(); setSelectedTask(null); }}
          />
          <TaskPopover
            task={selectedTask}
            blockRect={selectedTaskRect}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleTaskUpdate}
            onUnschedule={handleTaskUnschedule}
          />
        </>,
        document.body
      )}

      {/* New task dialog — portal keeps it above all overflow-hidden containers */}
      {newTaskSlot && typeof document !== "undefined" && createPortal(
        <NewTaskDialog
          slot={newTaskSlot}
          onClose={() => setNewTaskSlot(null)}
          onCreate={handleCreateTask}
        />,
        document.body
      )}
    </div>
  );
}
