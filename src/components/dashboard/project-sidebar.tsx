"use client";

import type { Project } from "@/types";
import { getGoalProgress } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface ProjectSidebarProps {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProjectSidebar({ projects, selectedId, onSelect }: ProjectSidebarProps) {
  return (
    <aside className="border-r border-atlas-border bg-atlas-panel px-3 py-4 text-sm flex flex-col gap-5 overflow-y-auto">
      <Section label="Active">
        {projects.map((p) => {
          const isActive = p.id === selectedId;
          const prog = getGoalProgress(p);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${
                isActive
                  ? "bg-atlas-panel-2 text-atlas-fg"
                  : "text-atlas-dim hover:bg-atlas-panel-2/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? "bg-atlas-ai" : "bg-atlas-dimmer"
                }`}
              />
              <span className={`flex-1 truncate text-[13px] ${isActive ? "font-medium" : ""}`}>
                {p.title}
              </span>
              <span className="text-[10px] font-mono text-atlas-dimmer tabular-nums">
                {prog}%
              </span>
            </button>
          );
        })}
        {projects.length === 0 && (
          <p className="px-2 py-1.5 text-[12px] text-atlas-dimmer">No active projects.</p>
        )}
      </Section>

      {/* Accountability partner — static placeholder until DB schema exists */}
      <div className="mt-auto bg-atlas-panel-2 rounded-xl p-3 border border-atlas-border">
        <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
          Accountability
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-7 h-7 rounded-full bg-atlas-border-hi grid place-items-center text-atlas-fg text-[11px] font-semibold">
            M
          </div>
          <div className="flex-1 leading-tight">
            <p className="text-[12px] text-atlas-fg">Marcus L.</p>
            <p className="text-[10px] text-atlas-dim">checks in 5pm</p>
          </div>
          <Inbox size={13} className="text-atlas-dimmer" />
        </div>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
