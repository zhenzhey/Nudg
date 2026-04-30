"use client";

import Link from "next/link";
import type { Deliverable, Project } from "@/types";
import { getCurrentWeek } from "@/lib/utils";

interface MiniMapProps {
  project: Project;
  deliverables: Deliverable[];
  currentDeliverableId: string | null;
}

// Lay nodes along a single smooth meandering route across the viewbox. The
// design uses a hand-tuned curve `M 20 90 Q 70 60 100 70 T 200 30` for 4
// nodes; here we generalize it to any deliverable count by stepping along
// the X axis and oscillating Y so the path reads as terrain.
function buildNodes(deliverables: Deliverable[], width: number, height: number) {
  const n = deliverables.length;
  if (n === 0) return [];
  const padX = 24;
  const padY = 22;
  const span = Math.max(1, n - 1);
  const innerW = width - 2 * padX;
  const innerH = height - 2 * padY;
  // Slight upward drift from bottom-left to top-right for a sense of progress.
  return deliverables.map((d, i) => {
    const t = i / span;
    const x = padX + innerW * t;
    // Oscillate around a downward-sloping center line so early nodes sit low,
    // later nodes climb up.
    const center = padY + innerH * (1 - t * 0.7);
    const wave = Math.sin(i * 0.95 + 0.6) * (innerH * 0.18);
    const y = Math.max(padY, Math.min(height - padY, center - wave));
    return { d, x, y };
  });
}

function status(d: Deliverable, isCurrent: boolean): "done" | "active" | "locked" {
  if (d.status === "submitted" || d.status === "verified") return "done";
  if (isCurrent) return "active";
  return "locked";
}

export function MiniMap({ project, deliverables, currentDeliverableId }: MiniMapProps) {
  const W = 240;
  const H = 120;
  const nodes = buildNodes(deliverables, W, H);

  // Single smooth path: first segment Q with a control point above the line,
  // subsequent segments use T (smooth continuation) so the curve flows.
  const pathD = (() => {
    if (nodes.length < 2) return nodes.length === 1 ? `M ${nodes[0].x} ${nodes[0].y}` : "";
    const [a, b, ...rest] = nodes;
    // Control point: between a and b, offset upward to give a gentle arc.
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - 12;
    let d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
    for (const p of rest) d += ` T ${p.x} ${p.y}`;
    return d;
  })();

  // Done segment uses the same shape but ends at last completed node.
  const lastDoneIdx = (() => {
    let idx = -1;
    nodes.forEach((nd, i) => {
      if (nd.d.status === "submitted" || nd.d.status === "verified") idx = i;
    });
    return idx;
  })();
  const donePath = (() => {
    if (lastDoneIdx < 1) return "";
    const slice = nodes.slice(0, lastDoneIdx + 1);
    const [a, b, ...rest] = slice;
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - 12;
    let d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
    for (const p of rest) d += ` T ${p.x} ${p.y}`;
    return d;
  })();

  const currentWeek = Math.min(getCurrentWeek(project.start_date), project.duration_weeks);

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
          Project Map
        </p>
        <Link href={`/projects/${project.id}`} className="text-[10px] text-atlas-dim hover:text-atlas-fg">
          Open ↗
        </Link>
      </div>
      <div
        className="relative rounded-lg border border-atlas-border overflow-hidden"
        style={{
          height: H,
          background:
            "radial-gradient(circle at 30% 30%, rgba(8, 145, 178, 0.10), transparent 60%), #f3f5f8",
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <pattern id="mmgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3e7ec" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mmgrid)" />
          {pathD && (
            <path d={pathD} fill="none" stroke="#0891b2" strokeWidth="2" strokeDasharray="4 3" />
          )}
          {donePath && (
            <path d={donePath} fill="none" stroke="#0891b2" strokeWidth="2" />
          )}
          {nodes.map(({ d, x, y }) => {
            const s = status(d, d.id === currentDeliverableId);
            if (s === "active") {
              return (
                <g key={d.id}>
                  <circle cx={x} cy={y} r={11} fill="none" stroke="#0891b2" strokeOpacity="0.3" strokeWidth="1" />
                  <circle cx={x} cy={y} r={6} fill="#0891b2" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            }
            const fill = s === "done" ? "#0f8c4a" : "#9aa5b3";
            const r = s === "done" ? 5 : 4;
            return (
              <circle key={d.id} cx={x} cy={y} r={r} fill={fill} />
            );
          })}
        </svg>
        <div className="absolute bottom-1.5 left-2 text-[9px] text-atlas-dim font-mono">
          {currentDeliverableId
            ? `WK ${currentWeek} · You are here`
            : `${nodes.length} chapter${nodes.length === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
}
