"use client";

import { useState } from "react";
import type { Deliverable } from "@/types";
import { EditableTaskList } from "@/components/tasks/editable-task-list";
import { RoadmapPath } from "@/components/projects/roadmap-path";
import { DeliverableDrawer } from "@/components/projects/deliverable-drawer";
import { Send, CheckCircle2 } from "lucide-react";

interface ProjectDetailViewProps {
  goalId: string;
  deliverables: Deliverable[];
  currentDeliverable: Deliverable | null;
  isProjectActive: boolean;
}

export function ProjectDetailView({
  goalId,
  deliverables,
  currentDeliverable,
  isProjectActive,
}: ProjectDetailViewProps) {
  const currentTaskCount = currentDeliverable?.tasks?.length ?? 0;
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const drawerDeliverable =
    deliverables.find((d) => d.id === drawerId) ?? null;

  return (
    <>
      {currentDeliverable ? (
        <section className="mb-10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-on-surface truncate">
              {currentDeliverable.title}
            </h2>
            <button
              onClick={() => setDrawerId(currentDeliverable.id)}
              className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              <Send size={11} />
              Submit
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-4 ring-1 ring-outline-variant/15">
            <EditableTaskList
              tasks={currentDeliverable.tasks ?? []}
              deliverableId={currentDeliverable.id}
              autoGenerate={isProjectActive && currentTaskCount === 0}
            />
          </div>
        </section>
      ) : (
        <section className="mb-10 rounded-2xl bg-success-muted ring-1 ring-success/20 p-5 text-center">
          <CheckCircle2 size={20} className="text-success mx-auto mb-1.5" />
          <p className="text-sm font-semibold text-success">
            All deliverables shipped
          </p>
          <p className="text-xs text-success/70 mt-0.5">
            Tap a node below to revisit details.
          </p>
        </section>
      )}

      <div className="pt-2 pb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Roadmap
          </h2>
          <span className="text-[11px] text-on-surface-variant">
            Tap a step to expand
          </span>
        </div>
        <RoadmapPath
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
