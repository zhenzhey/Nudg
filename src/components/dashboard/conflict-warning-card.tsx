"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, Wand2, Pencil } from "lucide-react";

interface Conflict {
  task: {
    id: string;
    title: string;
    scheduled_date: string;
    scheduled_time: number;
    estimated_hours: number | null;
    deliverable_title?: string;
    project_title?: string;
  };
  blocking_event: { title: string; startISO: string; endISO: string };
}

function fmtHour(h: number): string {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const ampm = hr >= 12 ? "pm" : "am";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return m === 0 ? `${display}${ampm}` : `${display}:${m.toString().padStart(2, "0")}${ampm}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtRange(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  return `${fmtHour(sh)}–${fmtHour(eh)}`;
}

export function ConflictWarningCard() {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/google/conflicts");
      if (!res.ok) return;
      const data = (await res.json()) as { connected: boolean; conflicts: Conflict[] };
      if (data.connected) setConflicts(data.conflicts);
    } catch {
      // Silent — overlay is optional.
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleKeep = async (taskId: string) => {
    setBusyId(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/dismiss-conflict`, { method: "POST" });
      setConflicts((prev) => prev.filter((c) => c.task.id !== taskId));
    } finally {
      setBusyId(null);
    }
  };

  const handleSmartReschedule = async (taskId: string) => {
    setBusyId(taskId);
    try {
      // Clearing scheduled_date triggers the route to drop the task; then we
      // immediately re-schedule with no date, letting the auto-slot logic pick.
      // Simpler: pass scheduled_date back as today so the slot finder runs and
      // skips the now-busy interval (since it reads Google busy).
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: today }),
      });
      if (res.status === 409) {
        // No free slot today — try tomorrow.
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await fetch(`/api/tasks/${taskId}/schedule`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: tomorrow.toISOString().slice(0, 10) }),
        });
      }
      await refresh();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded || conflicts.length === 0) return null;

  return (
    <div className="bg-warning-muted border border-warning/40 rounded-2xl p-4 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-warning/15 rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-warning" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-on-surface">
            {conflicts.length === 1 ? "Schedule conflict" : `${conflicts.length} schedule conflicts`}
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            New events on your Google Calendar overlap with already-scheduled tasks.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {conflicts.map((c) => {
          const isBusy = busyId === c.task.id;
          return (
            <div
              key={c.task.id}
              className="bg-surface rounded-xl border border-outline/15 p-3"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface truncate">{c.task.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {fmtDate(c.task.scheduled_date)} · {fmtHour(c.task.scheduled_time)}
                    {c.task.estimated_hours ? ` · ${c.task.estimated_hours}h` : ""}
                  </p>
                  <p className="text-[11px] text-warning mt-1 truncate">
                    Conflicts with: <span className="font-medium">{c.blocking_event.title}</span>
                    {" "}({fmtRange(c.blocking_event.startISO, c.blocking_event.endISO)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleKeep(c.task.id)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container/80 text-on-surface-variant disabled:opacity-50 transition-colors"
                >
                  <X size={12} /> Keep
                </button>
                <button
                  onClick={() => handleSmartReschedule(c.task.id)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Wand2 size={12} /> Smart reschedule
                </button>
                <Link
                  href={`/calendar?task=${c.task.id}&date=${c.task.scheduled_date}`}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-outline/30 hover:bg-surface-container text-on-surface transition-colors"
                >
                  <Pencil size={12} /> Edit manually
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
