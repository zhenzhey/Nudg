"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import type { Task } from "@/types";

interface ScheduledTask extends Task {
  deliverable_title: string;
  project_title: string;
}

interface ScheduleViewProps {
  todayTasks: ScheduledTask[];
  tomorrowTasks: ScheduledTask[];
  today: string;
  tomorrow: string;
  onTaskUpdate: (taskId: string, patch: Partial<Task>) => void;
}

const HOUR_HEIGHT = 56;
const TOTAL_HOURS = 24;
const CARD_HEIGHT = 480;

interface CalendarEvent {
  id: string;
  title: string;
  subtitle: string;
  startHour: number;
  durationHours: number;
  color: "primary" | "neutral";
  scheduledDate: string;
}

function buildEvents(
  tasks: ScheduledTask[],
  defaultStartHour: number,
  color: "primary" | "neutral",
  scheduledDate: string,
  orderOverride?: string[]
): CalendarEvent[] {
  const ordered = orderOverride
    ? [...tasks].sort((a, b) => orderOverride.indexOf(a.id) - orderOverride.indexOf(b.id))
    : tasks;
  let cursor = defaultStartHour;
  return ordered.map((t) => {
    const dur = t.estimated_hours ?? 1;
    // Use persisted scheduled_time if available, otherwise stack sequentially
    const startHour = t.scheduled_time ?? cursor;
    const ev: CalendarEvent = { id: t.id, title: t.title, subtitle: t.project_title, startHour, durationHours: dur, color, scheduledDate };
    cursor = startHour + dur;
    return ev;
  });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

// ── Day view: Sortable event block ────────────────────────────────────────

function SortableEventBlock({ event, overrideTop }: { event: CalendarEvent; overrideTop?: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: event.id,
    data: { event },
  });

  // Use override if available (user dragged to a specific slot), else computed position
  const top = overrideTop ?? event.startHour * HOUR_HEIGHT;
  const height = Math.max(event.durationHours * HOUR_HEIGHT - 4, 28);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute left-0 right-0 mx-1 rounded-lg px-2.5 py-1.5 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none ${
        event.color === "primary"
          ? "bg-primary/15 border border-primary/25 hover:bg-primary/20"
          : "bg-neutral/8 border border-outline-variant/40 hover:bg-neutral/12"
      } transition-colors`}
      style={{ top, height, opacity: isDragging ? 0.25 : 1 }}
    >
      <p className={`text-xs font-semibold truncate leading-tight ${event.color === "primary" ? "text-primary-dim" : "text-on-surface"}`}>
        {event.title}
      </p>
      {height > 36 && (
        <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{event.subtitle}</p>
      )}
    </div>
  );
}

// Ghost shown in DragOverlay
function GhostBlock({ event }: { event: CalendarEvent }) {
  const height = Math.max(event.durationHours * HOUR_HEIGHT - 4, 28);
  return (
    <div
      className={`rounded-lg px-2.5 py-1.5 overflow-hidden select-none w-48 shadow-lg opacity-90 ${
        event.color === "primary" ? "bg-primary/15 border border-primary/40" : "bg-neutral/8 border border-outline-variant/60"
      }`}
      style={{ height }}
    >
      <p className={`text-xs font-semibold truncate leading-tight ${event.color === "primary" ? "text-primary-dim" : "text-on-surface"}`}>
        {event.title}
      </p>
    </div>
  );
}

// ── Week view: Droppable day column ───────────────────────────────────────

function DroppableDayColumn({ date, children }: { date: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${date}` });
  return (
    <div ref={setNodeRef} style={{ minHeight: 60 }} className={`rounded-xl transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
      {children}
    </div>
  );
}

// ── Week view: Draggable task row ─────────────────────────────────────────

function WeekTaskRow({ task, isToday }: { task: ScheduledTask; isToday: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center gap-2 p-2.5 bg-surface-container rounded-xl cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isToday ? "bg-primary" : "bg-on-surface-variant"}`} />
      <span className="text-sm text-on-surface flex-1 truncate">{task.title}</span>
      {task.estimated_hours && <span className="text-xs text-on-surface-variant shrink-0">{task.estimated_hours}h</span>}
    </div>
  );
}

// ── Main ScheduleView ─────────────────────────────────────────────────────

export function ScheduleView({ todayTasks, tomorrowTasks, today, tomorrow, onTaskUpdate }: ScheduleViewProps) {
  const [view, setView] = useState<"day" | "week">("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [todayOrder, setTodayOrder] = useState<string[]>(() => todayTasks.map((t) => t.id));
  const [tomorrowOrder, setTomorrowOrder] = useState<string[]>(() => tomorrowTasks.map((t) => t.id));
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  // Pixel top overrides set when a task is dragged to a specific time slot
  const [customTops, setCustomTops] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Sync order when tasks added/removed from outside
  useEffect(() => {
    setTodayOrder((prev) => {
      const ids = todayTasks.map((t) => t.id);
      return [...prev.filter((id) => ids.includes(id)), ...ids.filter((id) => !prev.includes(id))];
    });
  }, [todayTasks]);

  useEffect(() => {
    setTomorrowOrder((prev) => {
      const ids = tomorrowTasks.map((t) => t.id);
      return [...prev.filter((id) => ids.includes(id)), ...ids.filter((id) => !prev.includes(id))];
    });
  }, [tomorrowTasks]);

  // Scroll to 1h before current time on mount
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const target = Math.max(0, now.getHours() + now.getMinutes() / 60 - 1) * HOUR_HEIGHT;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.scrollTop = target;
      scrolled.current = true;
    }));
  });

  const startHour = useMemo(() => {
    const now = new Date();
    return Math.ceil(now.getHours() + now.getMinutes() / 60);
  }, []);

  const todayEvents = useMemo(
    () => buildEvents(todayTasks, startHour, "primary", today, todayOrder),
    [todayTasks, startHour, today, todayOrder]
  );
  const tomorrowEvents = useMemo(
    () => buildEvents(tomorrowTasks, startHour, "neutral", tomorrow, tomorrowOrder),
    [tomorrowTasks, startHour, tomorrow, tomorrowOrder]
  );

  const displayDate = dayOffset === 0 ? today : tomorrow;
  const displayEvents = dayOffset === 0 ? todayEvents : tomorrowEvents;
  const displayOrder = dayOffset === 0 ? todayOrder : tomorrowOrder;
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const allEvents = [...todayEvents, ...tomorrowEvents];
    setActiveEvent(allEvents.find((ev) => ev.id === e.active.id) ?? null);
  }, [todayEvents, tomorrowEvents]);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveEvent(null);
    const { active, over } = e;
    const draggedId = active.id as string;
    const overId = over ? String(over.id) : null;

    // Week view: drop onto a day column → reschedule to that date
    if (overId?.startsWith("day-")) {
      const targetDate = overId.replace("day-", "");
      const allTasks = [...todayTasks, ...tomorrowTasks];
      const task = allTasks.find((t) => t.id === draggedId);
      if (!task || task.scheduled_date === targetDate) return;
      onTaskUpdate(draggedId, { scheduled_date: targetDate });
      await fetch(`/api/tasks/${draggedId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: targetDate }),
      });
      return;
    }

    // Day view: dropped onto another event → reorder
    if (overId && overId !== draggedId) {
      const currentOrder = dayOffset === 0 ? todayOrder : tomorrowOrder;
      const setOrder = dayOffset === 0 ? setTodayOrder : setTomorrowOrder;
      const oldIdx = currentOrder.indexOf(draggedId);
      const newIdx = currentOrder.indexOf(overId);
      if (oldIdx !== -1 && newIdx !== -1) {
        setOrder(arrayMove(currentOrder, oldIdx, newIdx));
        // Clear any custom position so the task uses its new computed slot
        setCustomTops((prev) => { const n = { ...prev }; delete n[draggedId]; return n; });
      }
      return;
    }

    // Day view: dropped in empty space → snap to dropped position and persist
    const grid = gridRef.current;
    const translated = active.rect.current.translated;
    if (!grid || !translated) return;
    const gridRect = grid.getBoundingClientRect();
    const rawTop = translated.top - gridRect.top;
    // Snap to 30-minute increments, clamped to 0–23.5h
    const snappedHour = Math.max(0, Math.min(23.5,
      Math.round((rawTop / HOUR_HEIGHT) * 2) / 2));
    const snappedTop = snappedHour * HOUR_HEIGHT;

    // Optimistic local update, then persist to DB
    setCustomTops((prev) => ({ ...prev, [draggedId]: snappedTop }));
    onTaskUpdate(draggedId, { scheduled_time: snappedHour });
    const allDayTasks = [...todayTasks, ...tomorrowTasks];
    const task = allDayTasks.find((t) => t.id === draggedId);
    fetch(`/api/tasks/${draggedId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: task?.scheduled_date ?? null, scheduled_time: snappedHour }),
    });
  }, [todayTasks, tomorrowTasks, dayOffset, todayOrder, tomorrowOrder, onTaskUpdate]);

  return (
    <DndContext
      id="schedule-dnd"
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="bg-surface rounded-2xl shadow-card border border-outline/15 flex flex-col overflow-hidden"
        style={{ height: CARD_HEIGHT }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface">Schedule</span>
            <span className="text-xs text-on-surface-variant">{formatDateLabel(displayDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {view === "day" && (
              <>
                <button onClick={() => setDayOffset(0)} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${dayOffset === 0 ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>Today</button>
                <button onClick={() => setDayOffset(1)} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${dayOffset === 1 ? "bg-neutral text-on-neutral" : "text-on-surface-variant hover:bg-surface-container"}`}>Tmrw</button>
              </>
            )}
            <div className="flex items-center gap-0.5 ml-1 bg-surface-container rounded-lg p-0.5">
              <button onClick={() => setView("day")} className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${view === "day" ? "bg-surface shadow-sm text-on-surface" : "text-on-surface-variant"}`}>Day</button>
              <button onClick={() => setView("week")} className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${view === "week" ? "bg-surface shadow-sm text-on-surface" : "text-on-surface-variant"}`}>Week</button>
            </div>
          </div>
        </div>

        {view === "week" ? (
          <div className="overflow-y-auto p-3 space-y-3" style={{ flex: 1, minHeight: 0 }}>
            {[
              { label: "Today", date: today, tasks: [...todayTasks].sort((a, b) => todayOrder.indexOf(a.id) - todayOrder.indexOf(b.id)) },
              { label: "Tomorrow", date: tomorrow, tasks: [...tomorrowTasks].sort((a, b) => tomorrowOrder.indexOf(a.id) - tomorrowOrder.indexOf(b.id)) },
            ].map((day) => (
              <DroppableDayColumn key={day.date} date={day.date}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 px-1">
                  {day.label} · {formatDateLabel(day.date)}
                </p>
                {day.tasks.length === 0 ? (
                  <p className="text-xs text-on-surface-variant pl-2 pb-2">Add a task from the Execution Plan</p>
                ) : (
                  <div className="space-y-1.5">
                    {day.tasks.map((t) => <WeekTaskRow key={t.id} task={t} isToday={day.label === "Today"} />)}
                  </div>
                )}
              </DroppableDayColumn>
            ))}
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-y-auto px-0 py-2" style={{ flex: 1, minHeight: 0 }}>
            {displayEvents.length === 0 && (
              <div className="flex items-center justify-center h-20 text-on-surface-variant">
                <p className="text-xs">Add a task from the Execution Plan</p>
              </div>
            )}
            <div ref={gridRef} className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: h * HOUR_HEIGHT }}>
                  <span className="text-[10px] text-on-surface-variant w-10 shrink-0 text-right pr-2 -translate-y-2 select-none">{formatHour(h)}</span>
                  <div className="flex-1 border-t border-outline/10" />
                </div>
              ))}
              <NowLine hourHeight={HOUR_HEIGHT} />
              <div className="absolute left-10 right-0 top-0 bottom-0">
                <SortableContext items={displayOrder} strategy={verticalListSortingStrategy}>
                  {displayEvents.map((ev) => (
                    <SortableEventBlock key={ev.id} event={ev} overrideTop={customTops[ev.id]} />
                  ))}
                </SortableContext>
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeEvent ? <GhostBlock event={activeEvent} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function NowLine({ hourHeight }: { hourHeight: number }) {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="absolute left-10 right-0 z-10 flex items-center" style={{ top: h * hourHeight }}>
      <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
      <div className="flex-1 border-t border-primary" />
    </div>
  );
}
