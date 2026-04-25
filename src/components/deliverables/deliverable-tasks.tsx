"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskList } from "@/components/tasks/task-list";
import type { Task } from "@/types";
import { RefreshCw, Loader2 } from "lucide-react";

interface DeliverableTasksProps {
  tasks: Task[];
  deliverableId: string;
  autoGenerate?: boolean;
}

export function DeliverableTasks({
  tasks,
  deliverableId,
  autoGenerate = true,
}: DeliverableTasksProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedAuto = useRef(false);

  async function generate() {
    setLoading(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      autoGenerate &&
      tasks.length === 0 &&
      !triedAuto.current &&
      !loading &&
      !error
    ) {
      triedAuto.current = true;
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, tasks.length]);

  if (tasks.length > 0) {
    return <TaskList tasks={tasks} deliverableId={deliverableId} />;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 p-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
        <Loader2 size={14} className="animate-spin" />
        Generating micro-tasks…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/50 p-4 text-center">
      <p className="text-sm text-on-surface-variant mb-3">
        {error
          ? `Couldn't generate tasks: ${error}`
          : "No micro-tasks yet for this deliverable."}
      </p>
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={14} />
        {error ? "Try again" : "Generate tasks"}
      </button>
    </div>
  );
}
