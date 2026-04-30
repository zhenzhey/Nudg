"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import type { Task } from "@/types";

interface ScheduledTask extends Task {
  deliverable_title?: string;
  project_title?: string;
}

interface DayCalendarProps {
  todayTasks: ScheduledTask[];
  today: string;
  focusTaskId?: string | null;
  onTaskUpdate?: (taskId: string, patch: Partial<Task>) => void;
}

interface GoogleEvent {
  id: string;
  title: string;
  startHour: number;
  durationHours: number;
}

const ROW_H = 36;             // pixels per hour row
const TOTAL_HOURS = 24;       // full-day timeline (scrollable)
const COL_LEFT = 30;          // px reserved for hour labels
const RIGHT_PAD = 6;          // px reserved on the right edge

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

function fmtRange(startHour: number, durationHours: number): string {
  const end = startHour + durationHours;
  const fmt = (h: number) => {
    const hr = Math.floor(h);
    const m = Math.round((h - hr) * 60);
    const ampm = hr >= 12 ? "pm" : "am";
    const display = hr % 12 === 0 ? 12 : hr % 12;
    return m === 0 ? `${display}${ampm}` : `${display}:${m.toString().padStart(2, "0")}${ampm}`;
  };
  return `${fmt(startHour)} – ${fmt(end)}`;
}

function totalDuration(tasks: ScheduledTask[]): string {
  const total = tasks.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  if (total === 0) return "";
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function todayLabel(today: string): string {
  const d = new Date(today + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DraggableTask({
  task,
  top,
  height,
  isFocus,
  startHour,
  durationHours,
}: {
  task: ScheduledTask;
  top: number;
  height: number;
  isFocus: boolean;
  startHour: number;
  durationHours: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute rounded-r-md px-2.5 py-1 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none transition-colors ${
        isFocus
          ? "bg-atlas-ai-soft border-l-[3px] border-atlas-ai"
          : "bg-atlas-panel-2 border-l-[3px] border-atlas-border-hi hover:bg-atlas-panel-2/80"
      }`}
      style={{
        left: COL_LEFT,
        right: RIGHT_PAD,
        top,
        height,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {isFocus && (
        <p className="text-[9px] text-atlas-ai font-semibold tracking-[0.08em] uppercase leading-none">
          Focus · protected
        </p>
      )}
      <p className={`text-[11px] font-medium leading-tight truncate ${isFocus ? "mt-0.5 text-atlas-fg" : "text-atlas-fg"}`}>
        {task.title}
      </p>
      {height >= 36 && (
        <p className="text-[9px] text-atlas-dim font-mono mt-0.5">
          {fmtRange(startHour, durationHours)}
        </p>
      )}
    </div>
  );
}

function DragGhost({ task, height, isFocus }: { task: ScheduledTask; height: number; isFocus: boolean }) {
  return (
    <div
      className={`rounded-r-md px-2.5 py-1 overflow-hidden select-none shadow-card ${
        isFocus
          ? "bg-atlas-ai-soft border-l-[3px] border-atlas-ai"
          : "bg-atlas-panel-2 border-l-[3px] border-atlas-border-hi"
      }`}
      style={{ height, width: 220 }}
    >
      <p className="text-[11px] font-medium leading-tight truncate text-atlas-fg">{task.title}</p>
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  return (
    <div
      className="absolute z-10 flex items-center pointer-events-none"
      style={{ top: h * ROW_H, left: COL_LEFT - 4, right: RIGHT_PAD }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-atlas-ai shrink-0" />
      <div className="flex-1 h-px bg-atlas-ai/70" />
    </div>
  );
}

export function DayCalendar({ todayTasks, today, focusTaskId, onTaskUpdate }: DayCalendarProps) {
  const [google, setGoogle] = useState<GoogleEvent[]>([]);
  const [activeTask, setActiveTask] = useState<ScheduledTask | null>(null);
  const [customTops, setCustomTops] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/google/events?from=${today}&to=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { connected: boolean; events: { id: string; title: string; startISO: string; endISO: string }[] } | null) => {
        if (cancelled || !data?.connected) return;
        const blocks: GoogleEvent[] = [];
        for (const ev of data.events) {
          const start = new Date(ev.startISO);
          const end = new Date(ev.endISO);
          const dayStart = new Date(`${today}T00:00:00`);
          const dayEnd = new Date(`${today}T23:59:59.999`);
          const s = start < dayStart ? dayStart : start;
          const e = end > dayEnd ? dayEnd : end;
          const startHour = s.getHours() + s.getMinutes() / 60;
          const durHours = (e.getTime() - s.getTime()) / 3_600_000;
          if (durHours <= 0) continue;
          blocks.push({ id: ev.id, title: ev.title, startHour, durationHours: durHours });
        }
        setGoogle(blocks);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [today]);

  // On first render, scroll the timeline so the current hour sits ~1h from
  // the top of the visible window.
  useEffect(() => {
    if (scrolled.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const target = Math.max(0, (now.getHours() + now.getMinutes() / 60 - 1) * ROW_H);
    requestAnimationFrame(() => {
      el.scrollTop = target;
      scrolled.current = true;
    });
  });

  const scheduled = todayTasks.filter((t) => t.scheduled_time != null);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i);
  const totalHeight = TOTAL_HOURS * ROW_H;

  const yFor = (hour: number) => hour * ROW_H;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const t = scheduled.find((s) => s.id === e.active.id);
    if (t) setActiveTask(t);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active } = e;
    const id = String(active.id);
    const grid = gridRef.current;
    const translated = active.rect.current.translated;
    if (!grid || !translated) return;
    const gridRect = grid.getBoundingClientRect();
    // grid's top is hour 0; translated.top is viewport-space, so subtracting
    // gives the y inside the grid (regardless of scrollTop, which already shifts
    // gridRect.top accordingly).
    const rawTop = translated.top - gridRect.top;
    const dropHour = rawTop / ROW_H;
    // Snap to 30-min, clamp to 0–23.5h.
    const snapped = Math.max(0, Math.min(23.5, Math.round(dropHour * 2) / 2));
    const snappedTop = yFor(snapped);

    setCustomTops((prev) => ({ ...prev, [id]: snappedTop }));
    onTaskUpdate?.(id, { scheduled_time: snapped });

    const task = scheduled.find((t) => t.id === id);
    fetch(`/api/tasks/${id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduled_date: task?.scheduled_date ?? today,
        scheduled_time: snapped,
      }),
    }).catch(() => { /* best-effort */ });
  };

  return (
    <DndContext
      id="day-calendar-dnd"
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="px-3.5 py-3 flex flex-col min-h-0 h-full">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
            Today · {todayLabel(today)}
          </p>
          <Link href="/calendar" className="text-[10px] text-atlas-dim font-mono hover:text-atlas-fg">
            {scheduled.length} block{scheduled.length === 1 ? "" : "s"}
            {totalDuration(scheduled) ? ` · ${totalDuration(scheduled)}` : ""}
          </Link>
        </div>

        {/* Scrollable 24h timeline */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div ref={gridRef} className="relative text-[10px] text-atlas-dim" style={{ height: totalHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-atlas-border"
                style={{ top: h * ROW_H, height: ROW_H, paddingLeft: COL_LEFT }}
              >
                <span className="absolute left-0 -top-1.5 text-[9px] font-mono text-atlas-dimmer">
                  {formatHour(h)}
                </span>
              </div>
            ))}

            <NowLine />

            {/* Google events — read-only background layer */}
            {google.map((g) => {
              const top = yFor(g.startHour);
              const height = Math.max(g.durationHours * ROW_H, 16);
              return (
                <div
                  key={`g-${g.id}`}
                  className="absolute rounded-r-md border-l-2 border-atlas-dimmer bg-atlas-dimmer/15 px-2 py-0.5 truncate text-[10px] text-atlas-dim italic pointer-events-none"
                  style={{
                    left: COL_LEFT,
                    right: RIGHT_PAD + 2,
                    top,
                    height,
                    zIndex: 0,
                  }}
                  title={g.title}
                >
                  {g.title}
                </div>
              );
            })}

            {/* Draggable tasks */}
            {scheduled.map((t) => {
              const startHour = t.scheduled_time!;
              const dur = t.estimated_hours ?? 1;
              const top = customTops[t.id] ?? yFor(startHour);
              const height = Math.max(dur * ROW_H, 24);
              return (
                <DraggableTask
                  key={t.id}
                  task={t}
                  top={top}
                  height={height}
                  isFocus={t.id === focusTaskId}
                  startHour={startHour}
                  durationHours={dur}
                />
              );
            })}

            {scheduled.length === 0 && google.length === 0 && (
              <p
                className="absolute left-0 right-0 grid place-items-center text-[11px] text-atlas-dim"
                style={{ top: 9 * ROW_H, height: ROW_H * 2 }}
              >
                Nothing scheduled today.
              </p>
            )}
          </div>
        </div>
      </div>

      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeTask ? (
          <DragGhost
            task={activeTask}
            height={Math.max((activeTask.estimated_hours ?? 1) * ROW_H, 24)}
            isFocus={activeTask.id === focusTaskId}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
