"use client";

import { useState } from "react";
import Link from "next/link";
import type { Deliverable } from "@/types";
import { ArrowLeft, Check, Inbox } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { RoadmapMap } from "@/components/projects/roadmap-map";
import { DeliverableDrawer } from "@/components/projects/deliverable-drawer";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";

interface ProjectDetailViewProps {
  goalId: string;
  projectTitle: string;
  projectDescription: string | null;
  startDate: string;
  daysLeft: number;
  progressPercent: number;
  deliverables: Deliverable[];
  currentDeliverable: Deliverable | null;
  isProjectActive: boolean;
}

export function ProjectDetailView({
  goalId,
  projectTitle,
  projectDescription,
  startDate,
  daysLeft,
  progressPercent,
  deliverables,
  currentDeliverable,
  isProjectActive,
}: ProjectDetailViewProps) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const drawerDeliverable =
    deliverables.find((d) => d.id === drawerId) ?? null;

  const totalDeliverables = deliverables.length;
  const currentIndex1 = currentDeliverable
    ? deliverables.findIndex((d) => d.id === currentDeliverable.id) + 1
    : totalDeliverables;

  return (
    <>
      <div
        className="bg-atlas-bg text-atlas-fg grid min-h-[calc(100vh-44px)]"
        style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}
      >
        {/* Sidebar */}
        <aside className="border-r border-atlas-border bg-atlas-panel px-[22px] py-6 overflow-y-auto flex flex-col">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[11px] text-atlas-dim hover:text-atlas-fg mb-1.5"
          >
            <ArrowLeft size={12} />
            Back to projects
          </Link>

          <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
            Project
          </p>
          <h1 className="text-[26px] font-semibold -tracking-[0.022em] mt-1 leading-[1.15] text-atlas-fg">
            {projectTitle}
          </h1>
          {projectDescription && (
            <p className="text-atlas-dim mt-2.5 text-[13px] leading-[1.5]">
              {projectDescription}
            </p>
          )}

          {/* Progress card */}
          <div className="mt-[18px] px-3.5 py-3 bg-atlas-panel-2 rounded-lg border border-atlas-border">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-atlas-dim">
                Deliverable {Math.min(currentIndex1, totalDeliverables)} of{" "}
                {totalDeliverables}
              </span>
              <span className="text-[11px] font-semibold text-atlas-fg tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1 bg-atlas-border rounded-sm mt-2 relative">
              <div
                className="absolute inset-y-0 left-0 bg-atlas-ai rounded-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-atlas-dim font-mono">
              <span>started {formatDate(startDate)}</span>
              <span>
                {isProjectActive && daysLeft > 0
                  ? `ships in ${daysLeft}d`
                  : daysLeft <= 0
                    ? "due"
                    : "—"}
              </span>
            </div>
          </div>

          {/* Compact non-editable task list of current deliverable */}
          {currentDeliverable && (
            <div className="mt-[22px]">
              <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold mb-2.5">
                Current step · tasks
              </p>
              <div className="flex flex-col">
                {(currentDeliverable.tasks ?? []).map((t) => {
                  const done = t.status === "completed";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 py-1.5 text-[12px]"
                    >
                      <span
                        className={cn(
                          "w-3.5 h-3.5 rounded-[3px] border grid place-items-center shrink-0",
                          done
                            ? "bg-atlas-done border-atlas-done text-white"
                            : "border-atlas-border-hi"
                        )}
                      >
                        {done && <Check size={9} className="stroke-[3]" />}
                      </span>
                      <span
                        className={cn(
                          "flex-1 truncate",
                          done
                            ? "line-through text-atlas-dim"
                            : "text-atlas-fg"
                        )}
                      >
                        {t.title}
                      </span>
                    </div>
                  );
                })}
                {(currentDeliverable.tasks?.length ?? 0) === 0 && (
                  <p className="text-[11px] text-atlas-dimmer py-1">
                    No tasks yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Accountability partner — hardcoded to match dashboard */}
          <div className="mt-[22px]">
            <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold mb-2.5">
              Accountability partner
            </p>
            <div className="flex items-center gap-2.5 px-3 py-2.5 border border-atlas-border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-atlas-border-hi grid place-items-center font-semibold text-atlas-fg">
                M
              </div>
              <div className="flex-1 text-[12px]">
                <p className="font-medium text-atlas-fg">Marcus L.</p>
                <p className="text-atlas-dim text-[11px]">
                  Daily 5pm check-in
                </p>
              </div>
              <Inbox size={14} className="text-atlas-dim" />
            </div>
          </div>

          <div className="mt-auto pt-6">
            <DeleteProjectButton projectId={goalId} />
          </div>
        </aside>

        {/* Map canvas */}
        <RoadmapMap
          deliverables={deliverables}
          currentDeliverableId={currentDeliverable?.id ?? null}
          isProjectActive={isProjectActive}
          selectedId={drawerId}
          onSelect={setDrawerId}
        />
      </div>

      {drawerDeliverable && (
        <DeliverableDrawer
          deliverable={drawerDeliverable}
          goalId={goalId}
          currentDeliverableId={currentDeliverable?.id ?? null}
          onClose={() => setDrawerId(null)}
        />
      )}
    </>
  );
}
