"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import type { Project, Deliverable, Task } from "@/types";

import { ProjectSidebar } from "./project-sidebar";
import { StatusBar } from "./status-bar";
import { FocusTaskCard } from "./focus-task-card";
import { ConflictWarningCard } from "./conflict-warning-card";
import { ExecutionPlan } from "./execution-plan";
import { MiniMap } from "./mini-map";
import { DayCalendar } from "./day-calendar";
import { useActiveProject } from "@/components/layout/active-project-context";

interface DashboardContentProps {
  projects: Project[];
  today: string;
  tomorrow: string;
}

export function DashboardContent({
  projects: initialProjects,
  today,
  tomorrow,
}: DashboardContentProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const { setActive } = useActiveProject();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  // Publish the active project for the breadcrumb in the navbar; clear on unmount
  // so the navbar doesn't show a stale project name on other pages.
  useEffect(() => {
    if (selected) setActive({ id: selected.id, title: selected.title });
    return () => setActive(null);
  }, [selected, setActive]);

  const sortedDeliverables = useMemo(() => {
    if (!selected) return [];
    return [...(selected.deliverables ?? [])].sort(
      (a: Deliverable, b: Deliverable) =>
        (a.order_index ?? a.week_number ?? 0) - (b.order_index ?? b.week_number ?? 0)
    );
  }, [selected]);

  const currentDeliverable = useMemo(
    () =>
      sortedDeliverables.find(
        (d) => d.status !== "submitted" && d.status !== "verified"
      ) ?? null,
    [sortedDeliverables]
  );

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
      const fallback = (currentDeliverable.tasks ?? []).find(
        (t) => t.status !== "completed"
      );
      if (fallback)
        return { task: fallback, deliverable: currentDeliverable };
    }
    return null;
  }, [selected, currentDeliverable]);

  const focusPosition = useMemo(() => {
    if (!focus) return null;
    const tasks = focus.deliverable.tasks ?? [];
    const idx = tasks.findIndex((t) => t.id === focus.task.id);
    if (idx < 0) return null;
    return { index: idx + 1, total: tasks.length };
  }, [focus]);

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

  const allTasks = useMemo(() => {
    if (!selected) return [];
    return (selected.deliverables ?? []).flatMap((d: Deliverable) =>
      (d.tasks ?? []).map((t) => ({
        ...t,
        deliverable_title: d.title,
        project_title: selected.title,
      }))
    );
  }, [selected]);

  const todayTasks = useMemo(
    () => allTasks.filter((t) => t.scheduled_date === today),
    [allTasks, today]
  );

  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    // Override the parent layout's lavender bg with atlas warm-white. The
    // negative margin compensates for any horizontal padding the parent main
    // wrapper might add — the dashboard fills edge-to-edge.
    <div
      className="bg-atlas-bg text-atlas-fg grid min-h-[calc(100vh-44px)]"
      style={{ gridTemplateColumns: "220px minmax(0, 1fr) 320px" }}
    >
      <ProjectSidebar
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Main column — atlas-bg shows through */}
      <div className="min-w-0 overflow-y-auto bg-atlas-bg">
        {selected && <StatusBar project={selected} deliverable={currentDeliverable} />}

        {focus && selected && (
          <div className="px-6 pt-[18px]">
            <FocusTaskCard
              key={focus.task.id}
              task={focus.task}
              deliverable={focus.deliverable}
              project={selected}
              taskIndex={focusPosition?.index}
              taskTotal={focusPosition?.total}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>
        )}

        {!focus && currentDeliverable && (
          <div className="mx-6 mt-[18px] rounded-[10px] bg-atlas-ai-soft/60 border border-atlas-ai/30 p-6 text-center">
            <Zap size={20} className="text-atlas-done mx-auto mb-2" />
            <p className="text-sm font-semibold text-atlas-fg">All tasks for this deliverable are done.</p>
            <Link href={`/projects/${selected?.id}`}>
              <button className="text-xs text-atlas-ai mt-2 hover:underline">View deliverable →</button>
            </Link>
          </div>
        )}

        <ConflictWarningCard />

        {selected && (
          <ExecutionPlan
            tasks={allTasks}
            today={today}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>

      {/* Right rail — atlas panel. The calendar gets a bounded height so it
          shows a window of the 24h timeline with internal scrolling, instead
          of stretching to fill the rail. */}
      <aside className="border-l border-atlas-border bg-atlas-panel flex flex-col">
        {selected && (
          <>
            <div className="border-b border-atlas-border">
              <MiniMap
                project={selected}
                deliverables={sortedDeliverables}
                currentDeliverableId={currentDeliverable?.id ?? null}
              />
            </div>
            <div className="h-[420px] shrink-0">
              <DayCalendar
                todayTasks={todayTasks}
                today={today}
                focusTaskId={focus?.task.id}
                onTaskUpdate={handleTaskUpdate}
              />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-atlas-bg">
      <div className="w-14 h-14 bg-atlas-panel rounded-2xl flex items-center justify-center mb-4 border border-atlas-border">
        <Zap size={24} className="text-atlas-ai" />
      </div>
      <h3 className="text-xl font-bold text-atlas-fg mb-2 tracking-tight">No active projects</h3>
      <p className="text-sm text-atlas-dim mb-6 max-w-xs">
        Start a project, let AI build your weekly roadmap, and start shipping.
      </p>
      <Link href="/projects/new">
        <button className="inline-flex items-center gap-1.5 bg-atlas-fg text-atlas-bg text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          <Plus size={15} />
          Start your first project
        </button>
      </Link>
    </div>
  );
}
