"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { Check, Clock } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  deliverableId: string;
}

export function TaskList({ tasks: initialTasks, deliverableId }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleTask(taskId: string, currentStatus: string) {
    setLoading(taskId);
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
      setLoading(null);
    }
  }

  const completed = tasks.filter((t) => t.status === "completed").length;

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
          <button
            key={task.id}
            onClick={() => toggleTask(task.id, task.status)}
            disabled={loading === task.id}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all cursor-pointer",
              task.status === "completed"
                ? "bg-success-muted ring-1 ring-success/15 opacity-70"
                : "bg-surface-container-low hover:bg-surface-container ring-1 ring-outline-variant/10 hover:ring-outline-variant/25"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                task.status === "completed"
                  ? "bg-success border-success"
                  : "border-outline-variant hover:border-primary"
              )}
            >
              {task.status === "completed" && (
                <Check size={11} className="text-white stroke-[3]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
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
            </div>

            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-on-surface-variant shrink-0">
                <Clock size={11} />
                {task.estimated_hours}h
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
