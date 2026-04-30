"use client";

import type { Deliverable } from "@/types";
import { Check, Lock } from "lucide-react";
import { cn, getDeliverableTaskProgress } from "@/lib/utils";

interface RoadmapMapProps {
  deliverables: Deliverable[];
  currentDeliverableId: string | null;
  isProjectActive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type NodeStatus = "done" | "active" | "locked";

interface PositionedNode {
  d: Deliverable;
  x: number; // percent 0-100
  y: number; // percent 0-100
  status: NodeStatus;
  index: number;
}

// Spread nodes along an undulating S-curve across the viewBox. Mirrors the
// hand-tuned curve in atlas.jsx but generalizes to any deliverable count.
function buildNodes(
  deliverables: Deliverable[],
  currentDeliverableId: string | null,
  isProjectActive: boolean
): PositionedNode[] {
  const n = deliverables.length;
  if (n === 0) return [];
  const padX = 15;
  const padY = 20;
  const span = Math.max(1, n - 1);
  const innerW = 100 - 2 * padX;
  const innerH = 100 - 2 * padY;

  return deliverables.map((d, i) => {
    const t = i / span;
    const x = padX + innerW * t;
    // Drift upward like atlas: early nodes low, late nodes high.
    const center = padY + innerH * (1 - t * 0.7);
    const wave = Math.sin(i * 0.95 + 0.6) * (innerH * 0.18);
    const y = Math.max(padY, Math.min(100 - padY, center - wave));

    const isDone = d.status === "submitted" || d.status === "verified";
    const isCurrent =
      isProjectActive && d.id === currentDeliverableId;
    const status: NodeStatus = isDone
      ? "done"
      : isCurrent
        ? "active"
        : "locked";

    return { d, x, y, status, index: i };
  });
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const [a, b, ...rest] = points;
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - 6;
  let d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
  for (const p of rest) d += ` T ${p.x} ${p.y}`;
  return d;
}

export function RoadmapMap({
  deliverables,
  currentDeliverableId,
  isProjectActive,
  selectedId,
  onSelect,
}: RoadmapMapProps) {
  const nodes = buildNodes(deliverables, currentDeliverableId, isProjectActive);

  const fullPath = buildPath(nodes);

  let lastDoneIdx = -1;
  nodes.forEach((nd, i) => {
    if (nd.status === "done") lastDoneIdx = i;
  });
  // Extend completed segment one node past the last done so it visually
  // reaches the active node, matching atlas (which draws the cyan segment
  // up to the "Now" node).
  const doneEnd = Math.min(nodes.length - 1, lastDoneIdx + 1);
  const donePath =
    doneEnd >= 1 ? buildPath(nodes.slice(0, doneEnd + 1)) : "";

  const activeNode = nodes.find((nd) => nd.status === "active") ?? null;

  return (
    <div className="relative overflow-hidden bg-atlas-bg">
      {/* Topo grid + radial wash + contour rings */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        <defs>
          <pattern
            id="topo-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#e3e7ec"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="topo-wash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-grid)" />
        <rect width="100%" height="100%" fill="url(#topo-wash)" />
        {[0.4, 0.6, 0.8].map((_, i) => (
          <ellipse
            key={i}
            cx="38%"
            cy="55%"
            rx={120 + i * 50}
            ry={70 + i * 30}
            fill="none"
            stroke="#c7cfd9"
            strokeOpacity={0.3 - i * 0.08}
            strokeDasharray="2 5"
          />
        ))}
      </svg>

      {/* Top-left toolbar hint */}
      <div className="absolute top-3.5 left-3.5 z-10 text-[11px] px-2.5 py-1.5 rounded-md bg-atlas-panel border border-atlas-border text-atlas-dim font-mono">
        Project Map · Tap a chapter to expand
      </div>

      {/* Path layer (viewBox stretches to fill) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {fullPath && (
          <path
            d={fullPath}
            fill="none"
            stroke="#c7cfd9"
            strokeWidth="2"
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {donePath && (
          <path
            d={donePath}
            fill="none"
            stroke="#0891b2"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Nodes */}
      {nodes.map((nd) => {
        const seq = nd.index + 1;
        const isSelected = selectedId === nd.d.id;
        const isActive = nd.status === "active";
        return (
          <button
            key={nd.d.id}
            type="button"
            onClick={() => onSelect(nd.d.id)}
            className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 group focus:outline-none cursor-pointer"
            style={{ left: `${nd.x}%`, top: `${nd.y}%` }}
            aria-label={`${nd.d.title} — ${nd.status}`}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-0 -m-3 rounded-full bg-atlas-ai/25"
                style={{ animation: "atlasPulse 2s infinite" }}
              />
            )}
            <span
              className={cn(
                "relative grid place-items-center rounded-full font-bold transition-transform duration-150 group-hover:-translate-y-0.5",
                isSelected && "ring-4 ring-atlas-ai/25",
                isActive
                  ? "w-11 h-11 text-[14px] bg-atlas-panel border-2 border-atlas-ai text-atlas-ai shadow-[0_4px_16px_rgba(8,145,178,0.35)]"
                  : nd.status === "done"
                    ? "w-8 h-8 text-[12px] bg-atlas-panel border-2 border-atlas-done text-atlas-done shadow-[0_2px_6px_rgba(15,23,34,0.06)]"
                    : "w-8 h-8 text-[12px] bg-atlas-panel border-2 border-atlas-dimmer text-atlas-dimmer shadow-[0_2px_6px_rgba(15,23,34,0.06)]"
              )}
            >
              {nd.status === "done" ? (
                <Check size={14} className="stroke-[3]" />
              ) : nd.status === "locked" ? (
                <Lock size={12} />
              ) : (
                seq
              )}
            </span>
            <div
              className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
              style={{ top: isActive ? 52 : 38, width: 160 }}
            >
              <p className="text-[9px] font-mono tracking-[0.1em] uppercase text-atlas-dim">
                Step {seq}
              </p>
              <p
                className={cn(
                  "text-[13px] font-semibold mt-0.5 -tracking-[0.005em] leading-tight line-clamp-2",
                  nd.status === "locked" ? "text-atlas-dim" : "text-atlas-fg"
                )}
              >
                {nd.d.title}
              </p>
              <p className="text-[10px] text-atlas-dim mt-0.5">
                {(nd.d.tasks?.length ?? 0)} task
                {(nd.d.tasks?.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </button>
        );
      })}

      {/* Inline expanded card pinned to active node */}
      {activeNode && <ActiveCard node={activeNode} />}

      <style>{`@keyframes atlasPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}`}</style>
    </div>
  );
}

function ActiveCard({ node }: { node: PositionedNode }) {
  const progress = getDeliverableTaskProgress(node.d);
  // Always place the card above the node. The gap scales with node height so
  // a low node (y≈80) gets a generous 140px breathing room, while a high
  // node (y≈20) shrinks to ~50px so the card stays inside the map without
  // ever drifting up to the toolbar.
  const gapPx = Math.max(50, Math.min(140, 50 + (node.y - 20) * 1.5));
  // Clamp horizontal anchor so a 260px-wide card doesn't overflow the map's
  // edges when the active node sits near the left/right boundary.
  const clampedX = Math.max(14, Math.min(86, node.x));

  return (
    <div
      className="absolute z-[2] w-[260px] p-3.5 rounded-[10px] bg-atlas-panel border border-atlas-ai shadow-[0_8px_24px_rgba(15,23,34,0.12),0_0_0_4px_rgba(8,145,178,0.12)]"
      style={{
        left: `${clampedX}%`,
        top: `${node.y}%`,
        transform: `translate(-50%, calc(-100% - ${gapPx}px))`,
      }}
    >
      <p className="text-[9px] font-mono tracking-[0.12em] uppercase text-atlas-ai font-semibold">
        Now · Step {node.index + 1}
      </p>
      <p className="text-[14px] font-semibold mt-1 leading-snug text-atlas-fg">
        {node.d.title}
      </p>
      {node.d.description && (
        <p className="text-[11px] text-atlas-dim mt-1.5 leading-relaxed line-clamp-2">
          {node.d.description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2.5 text-[10px] text-atlas-dim font-mono">
        <span>
          {progress.completed} / {progress.total} tasks
        </span>
        <div className="flex-1 h-[3px] bg-atlas-border rounded-full relative">
          <div
            className="absolute inset-y-0 left-0 bg-atlas-ai rounded-full"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
