"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn, getDeliverableTaskProgress } from "@/lib/utils";
import { EditableTaskList } from "@/components/tasks/editable-task-list";
import { SubmissionForm } from "@/components/deliverables/submission-form";
import { StatusBadge } from "@/components/ui/badge";
import type { Deliverable } from "@/types";
import { VERIFICATION_TYPE_LABELS } from "@/types";
import { X, Lock } from "lucide-react";

interface DeliverableDrawerProps {
  deliverable: Deliverable;
  goalId: string;
  currentDeliverableId: string | null;
  onClose: () => void;
}

export function DeliverableDrawer({
  deliverable,
  goalId,
  currentDeliverableId,
  onClose,
}: DeliverableDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCurrent = deliverable.id === currentDeliverableId;
  const isCompleted =
    deliverable.status === "submitted" || deliverable.status === "verified";
  const isFuture = !isCurrent && !isCompleted;
  const taskProgress = getDeliverableTaskProgress(deliverable);
  const seq = (deliverable.week_number ?? deliverable.order_index + 1) as number;

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-0 z-[100] bg-black/40",
        "flex sm:justify-end",
        "max-sm:items-end"
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-surface-container-lowest shadow-2xl flex flex-col",
          "sm:h-full sm:w-full sm:max-w-[520px]",
          "max-sm:w-full max-sm:h-[88vh] max-sm:rounded-t-3xl"
        )}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-outline-variant/50" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant/15 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase tracking-widest",
                    isCurrent ? "text-primary" : "text-on-surface-variant"
                  )}
                >
                  Step {seq}
                </span>
                {taskProgress.total > 0 && (
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    · {taskProgress.completed}/{taskProgress.total} tasks
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-on-surface leading-tight">
                {deliverable.title}
              </h3>
              {deliverable.description && (
                <p className="text-sm text-on-surface-variant mt-1.5">
                  {deliverable.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={deliverable.status} />
                <span className="inline-flex items-center px-2.5 py-1 bg-tertiary-container/60 text-on-tertiary-container rounded-full text-[10px] font-medium">
                  {
                    VERIFICATION_TYPE_LABELS[
                      deliverable.verification_type ?? "manual_upload"
                    ]
                  }
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {isFuture && (deliverable.tasks?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low/40 p-4 text-center">
              <p className="text-xs text-on-surface-variant">
                <Lock size={11} className="inline mr-1" />
                Future step — focus on the current one first. You can still plan
                tasks here.
              </p>
            </div>
          ) : (
            <EditableTaskList
              tasks={deliverable.tasks ?? []}
              deliverableId={deliverable.id}
              autoGenerate={false}
            />
          )}

          {!isFuture && (
            <SubmissionForm deliverable={deliverable} goalId={goalId} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
