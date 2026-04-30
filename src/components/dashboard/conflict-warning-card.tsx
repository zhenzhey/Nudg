"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

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

function fmtRange(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = e.getHours() + e.getMinutes() / 60;
  return `${fmtHour(sh)}–${fmtHour(eh)}`;
}

function relativeTime(secondsAgo: number): string {
  if (secondsAgo < 60) return "just now";
  const mins = Math.round(secondsAgo / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
}

export function ConflictWarningCard() {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/google/conflicts");
      if (!res.ok) return;
      const data = (await res.json()) as { connected: boolean; conflicts: Conflict[] };
      if (data.connected) {
        setConflicts(data.conflicts);
        setFetchedAt(Date.now());
      }
    } catch {
      // Silent — overlay is optional.
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDismiss = async (taskId: string) => {
    setDismissedIds((prev) => new Set(prev).add(taskId));
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
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_date: today }),
      });
      if (res.status === 409) {
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

  if (!loaded) return null;
  const visible = conflicts.filter((c) => !dismissedIds.has(c.task.id));
  if (visible.length === 0) return null;

  // Show only the first conflict in the slim strip; if there are multiple, the
  // count nudges the user to the calendar page where they can resolve in bulk.
  const c = visible[0];
  const isBusy = busyId === c.task.id;
  const ageSeconds = fetchedAt ? Math.round((Date.now() - fetchedAt) / 1000) : 0;

  return (
    <div className="mx-6 mt-3 px-3.5 py-3 border border-atlas-warn/40 bg-atlas-warn/10 rounded-lg flex items-center gap-3 text-[12px]">
      <div className="w-[22px] h-[22px] rounded-full bg-atlas-warn text-white grid place-items-center text-[12px] font-semibold shrink-0">
        !
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-atlas-fg truncate">
          Schedule conflict — {c.blocking_event.title} {fmtRange(c.blocking_event.startISO, c.blocking_event.endISO)} overlaps {c.task.title}
        </p>
        <p className="text-atlas-dim text-[11px] mt-0.5">
          Pulled from Google Calendar {relativeTime(ageSeconds)}
          {visible.length > 1 ? ` · ${visible.length - 1} more` : ""}
        </p>
      </div>
      <button
        onClick={() => handleSmartReschedule(c.task.id)}
        disabled={isBusy}
        className="px-2.5 py-1.5 border border-atlas-border bg-atlas-panel rounded-md text-[11px] flex items-center gap-1.5 text-atlas-fg hover:bg-atlas-panel-2 disabled:opacity-50 transition-colors"
      >
        <Sparkles size={11} className="text-atlas-ai" />
        Smart reschedule
      </button>
      <button
        onClick={() => handleDismiss(c.task.id)}
        disabled={isBusy}
        className="px-2.5 py-1.5 text-atlas-dim text-[11px] hover:text-atlas-fg transition-colors disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  );
}
