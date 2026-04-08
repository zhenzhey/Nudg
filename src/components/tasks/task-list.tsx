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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus as Task["status"], completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
    } catch {
      // Revert on failure
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
        <h4 className="text-sm font-medium text-text-secondary">Micro-tasks</h4>
        <span className="text-xs text-text-muted font-mono">
          {completed}/{tasks.length} done
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id, task.status)}
            disabled={loading === task.id}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
              "hover:border-border-2 cursor-pointer",
              task.status === "completed"
                ? "bg-success-muted border-success/20 opacity-75"
                : "bg-surface-2 border-border hover:bg-surface-3"
            )}
          >
            {/* Checkbox */}
            <div
              className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                task.status === "completed"
                  ? "bg-success border-success"
                  : "border-border-2 hover:border-primary"
              )}
            >
              {task.status === "completed" && (
                <Check size={11} className="text-white stroke-[3]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  task.status === "completed"
                    ? "line-through text-text-muted"
                    : "text-text-primary"
                )}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-text-muted mt-0.5">{task.description}</p>
              )}
            </div>

            {/* Time estimate */}
            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                <Clock size={11} />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
