"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getCurrentWeek, getGoalProgress } from "@/lib/utils";
import { DeliverableCard } from "@/components/dashboard/deliverable-card";
import { FocusTaskCard } from "@/components/dashboard/focus-task-card";
import { ScheduleView } from "@/components/dashboard/schedule-view";
import { ConflictWarningCard } from "@/components/dashboard/conflict-warning-card";
import type { Project, Deliverable, Task } from "@/types";
import { Zap, Search, Mic, Sparkles, Plus } from "lucide-react";
import { InboxInput } from "@/components/dashboard/inbox-input";

interface DashboardContentProps {
  projects: Project[];
  today: string;
  tomorrow: string;
}

export function DashboardContent({ projects: initialProjects, today, tomorrow }: DashboardContentProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const [aiQuery, setAiQuery] = useState("");

  // Sync with refreshed server data after router.refresh().
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];
  const currentWeek = selected ? getCurrentWeek(selected.start_date) : 1;
  const progress = selected ? getGoalProgress(selected) : 0;

  const currentDeliverable = useMemo(() => {
    if (!selected) return null;
    const sorted = [...(selected.deliverables ?? [])].sort(
      (a: Deliverable, b: Deliverable) =>
        (a.order_index ?? a.week_number ?? 0) - (b.order_index ?? b.week_number ?? 0)
    );
    return (
      sorted.find(
        (d: Deliverable) => d.status !== "submitted" && d.status !== "verified"
      ) ?? null
    );
  }, [selected]);

  // Pick the "focus" task: nearest scheduled pending task in the selected
  // project (any date, ordered by scheduled_date then scheduled_time). Fall
  // back to the first pending task in the current deliverable. The task's own
  // deliverable wins for the small header — even if it isn't currentDeliverable.
  const focus = useMemo(() => {
    if (!selected) return null;
    const all = (selected.deliverables ?? []).flatMap((d: Deliverable) =>
      (d.tasks ?? []).map((t) => ({ task: t, deliverable: d }))
    );
    const pending = all.filter(({ task }) => task.status !== "completed");

    const scheduled = pending
      .filter(({ task }) => task.scheduled_date != null)
      .sort((a, b) => {
        const da = a.task.scheduled_date ?? "";
        const db = b.task.scheduled_date ?? "";
        if (da !== db) return da.localeCompare(db);
        return (a.task.scheduled_time ?? 0) - (b.task.scheduled_time ?? 0);
      });
    if (scheduled.length > 0) return scheduled[0];

    if (currentDeliverable) {
      const fallback = (currentDeliverable.tasks ?? []).find((t) => t.status !== "completed");
      if (fallback) return { task: fallback, deliverable: currentDeliverable };
    }
    return null;
  }, [selected, currentDeliverable]);

  const handleTaskUpdate = (taskId: string, patch: Partial<Task>) => {
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        deliverables: (p.deliverables ?? []).map((d: Deliverable) => ({
          ...d,
          tasks: (d.tasks ?? []).map((t: Task) =>
            t.id === taskId ? { ...t, ...patch } : t
          ),
        })),
      }))
    );
  };

  const allScheduledTasks = useMemo(() =>
    projects.flatMap((p) =>
      (p.deliverables ?? []).flatMap((d: Deliverable) =>
        (d.tasks ?? []).map((t: Task) => ({
          ...t,
          deliverable_title: d.title,
          project_title: p.title,
        }))
      )
    ), [projects]);

  const todayTasks = allScheduledTasks.filter((t) => t.scheduled_date === today && t.scheduled_time != null);
  const tomorrowTasks = allScheduledTasks.filter((t) => t.scheduled_date === tomorrow && t.scheduled_time != null);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-4 shadow-card">
          <Zap size={24} className="text-primary" />
        </div>
        <h3 className="text-xl font-black text-on-surface mb-2">No active projects</h3>
        <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
          Start a project, let AI build your weekly roadmap, and start shipping.
        </p>
        <Link href="/projects/new">
          <button className="inline-flex items-center gap-1.5 bg-neutral text-on-neutral text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={15} />
            Start your first project
          </button>
        </Link>
      </div>
    );
  }

  const phaseName = currentDeliverable?.title ?? `Week ${currentWeek}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-slide-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Project Execution
          </p>
          <h1 className="text-3xl font-black tracking-tight text-on-surface leading-none">
            {selected?.title ?? "Dashboard"}
          </h1>
        </div>
      </div>

      {/* ── Project switcher ────────────────────────────────── */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {projects.map((p) => {
            const prog = getGoalProgress(p);
            const isActive = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? "bg-surface border-primary/30 text-on-surface shadow-card"
                    : "bg-surface/60 border-outline/20 text-on-surface-variant hover:bg-surface hover:text-on-surface"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : "bg-on-surface-variant/40"}`} />
                {p.title}
                <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
                  {prog}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Google Calendar conflict warnings ───────────────── */}
      <ConflictWarningCard />

      {/* ── Progress bar ────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-outline/20 shadow-card px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-primary">
            Phase {currentWeek}: {phaseName}
          </span>
          <span className="text-sm font-bold text-on-surface">{progress}% Complete</span>
        </div>
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Main 2-column grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* Left: deliverable + ask AI */}
        <div className="space-y-4">
          {focus && selected && (
            <FocusTaskCard
              key={focus.task.id}
              task={focus.task}
              deliverable={focus.deliverable}
              project={selected}
              onTaskUpdate={handleTaskUpdate}
            />
          )}
          {currentDeliverable && selected ? (
            <DeliverableCard
              key={currentDeliverable.id}
              deliverable={currentDeliverable as Deliverable & { tasks: Task[] }}
              today={today}
              tomorrow={tomorrow}
              onTaskUpdate={handleTaskUpdate}
            />
          ) : (
            <div className="bg-surface rounded-2xl border border-outline/20 shadow-card p-8 text-center">
              <div className="w-10 h-10 bg-success-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap size={20} className="text-success" />
              </div>
              <h3 className="text-base font-bold text-on-surface mb-1">All caught up!</h3>
              <p className="text-sm text-on-surface-variant mb-4">No pending deliverables this week.</p>
              <Link href={`/projects/${selected?.id}`}>
                <button className="text-sm text-primary font-semibold hover:underline">View project →</button>
              </Link>
            </div>
          )}

          {/* Ask AI */}
          <div className="bg-surface rounded-2xl border border-outline/20 shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-primary/10 rounded-md flex items-center justify-center">
                <Sparkles size={11} className="text-primary" />
              </div>
              <span className="text-sm font-bold text-on-surface">
                {selected?.title ? `${selected.title} AI` : "Project AI"}
              </span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuery.trim() && selected)
                  window.location.href = `/projects/${selected.id}?ai=${encodeURIComponent(aiQuery)}`;
              }}
            >
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask AI to analyze deliverables, search docs, or suggest next steps..."
                  className="w-full bg-surface-container text-sm text-on-surface placeholder:text-inverse-on-surface rounded-xl pl-8 pr-9 py-2.5 border border-outline/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Mic size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: inbox + schedule */}
        <div className="space-y-4">
          <InboxInput
            projectId={selected?.id}
            deliverableId={currentDeliverable?.id}
            projectTitle={selected?.title}
            deliverableTitle={currentDeliverable?.title}
          />
          <ScheduleView
            todayTasks={todayTasks}
            tomorrowTasks={tomorrowTasks}
            today={today}
            tomorrow={tomorrow}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      </div>
    </div>
  );
}
