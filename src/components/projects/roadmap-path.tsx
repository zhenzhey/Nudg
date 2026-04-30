"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { Deliverable } from "@/types";
import { Check, Lock, Sparkles } from "lucide-react";

interface RoadmapPathProps {
  deliverables: Deliverable[];
  currentDeliverableId: string | null;
  isProjectActive: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const NODE_GAP = 130; // vertical gap between node centers
const AMPLITUDE = 70;
const NODE_SIZE = 80;

function offsetFor(i: number) {
  return Math.sin(i * 0.85 + 0.3) * AMPLITUDE;
}

type NodeState = "completed" | "current" | "future";

function stateOf(
  d: Deliverable,
  isCurrent: boolean,
  isFuture: boolean
): NodeState {
  if (d.status === "submitted" || d.status === "verified") return "completed";
  if (isCurrent) return "current";
  if (isFuture) return "future";
  return "current"; // overdue / past-but-not-submitted — still actionable
}

export function RoadmapPath({
  deliverables,
  currentDeliverableId,
  isProjectActive,
  selectedId,
  onSelect,
}: RoadmapPathProps) {
  if (deliverables.length === 0) return null;

  const currentIndex = deliverables.findIndex(
    (d) => d.id === currentDeliverableId
  );

  return (
    <div className="relative w-full">
      {deliverables.map((deliverable, i) => {
        const isCurrent =
          deliverable.id === currentDeliverableId && isProjectActive;
        const isFuture =
          currentIndex !== -1 &&
          i > currentIndex &&
          deliverable.status !== "submitted" &&
          deliverable.status !== "verified";
        const state = stateOf(deliverable, isCurrent, isFuture);
        const offsetA = offsetFor(i);
        const isSelected = selectedId === deliverable.id;
        const seq = (deliverable.week_number ??
          deliverable.order_index + 1) as number;

        return (
          <Fragment key={deliverable.id}>
            {i > 0 && (
              <Connector
                from={offsetFor(i - 1)}
                to={offsetA}
                prevCompleted={
                  deliverables[i - 1].status === "submitted" ||
                  deliverables[i - 1].status === "verified"
                }
              />
            )}

            <div className="relative flex justify-center">
              <button
                onClick={() => onSelect(deliverable.id)}
                style={{ transform: `translateX(${offsetA}px)` }}
                className="relative group cursor-pointer focus:outline-none"
                aria-label={`${deliverable.title} — ${state}`}
              >
                <NodeBubble state={state} seq={seq} selected={isSelected} />
                <NodeLabel
                  title={deliverable.title}
                  state={state}
                  selected={isSelected}
                />
              </button>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function Connector({
  from,
  to,
  prevCompleted,
}: {
  from: number;
  to: number;
  prevCompleted: boolean;
}) {
  const W = AMPLITUDE * 4;
  const path = `M ${from},0 C ${from},${NODE_GAP / 2} ${to},${NODE_GAP / 2} ${to},${NODE_GAP}`;
  const stroke = prevCompleted
    ? "rgba(94, 106, 210, 0.85)"
    : "rgba(108, 119, 145, 0.18)";
  const shadow = prevCompleted
    ? "rgba(94, 106, 210, 0.30)"
    : "rgba(108, 119, 145, 0.10)";

  return (
    <div
      className="flex justify-center pointer-events-none relative -my-2 z-0"
      aria-hidden
    >
      <svg
        viewBox={`-${W / 2} 0 ${W} ${NODE_GAP}`}
        width={W}
        height={NODE_GAP}
        className="block"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 3D drop shadow band */}
        <path
          d={path}
          fill="none"
          stroke={shadow}
          strokeWidth={14}
          strokeLinecap="round"
          transform="translate(0, 4)"
        />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function NodeBubble({
  state,
  seq,
  selected,
}: {
  state: NodeState;
  seq: number;
  selected: boolean;
}) {
  return (
    <div
      className="relative z-10"
      style={{ width: NODE_SIZE, height: NODE_SIZE }}
    >
      {/* Selection halo (static, no animation to avoid paint thrash) */}
      {selected && (
        <span
          aria-hidden
          className={cn(
            "absolute -inset-1.5 rounded-full ring-[3px]",
            state === "completed" && "ring-success/50",
            state === "current" && "ring-primary/60",
            state === "future" && "ring-outline-variant/50"
          )}
        />
      )}
      {/* 3D button: bottom shadow plate */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full translate-y-[6px]",
          state === "completed" && "bg-success/55",
          state === "current" && "bg-primary/55",
          state === "future" && "bg-outline-variant/45"
        )}
      />
      {/* Main face */}
      <div
        className={cn(
          "absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-150",
          "border-[4px] group-hover:-translate-y-0.5 group-active:translate-y-1.5",
          state === "completed" &&
            "bg-success text-white border-white shadow-[0_4px_12px_-2px_rgba(21,128,61,0.45)]",
          state === "current" &&
            "bg-gradient-to-br from-primary to-accent text-on-primary border-white shadow-[0_6px_18px_-2px_rgba(94,106,210,0.55)]",
          state === "future" &&
            "bg-surface-container-high text-on-surface-variant border-surface"
        )}
      >
        {state === "completed" ? (
          <Check size={32} className="stroke-[3]" />
        ) : state === "future" ? (
          <Lock size={24} />
        ) : (
          <span className="text-2xl font-black">{seq}</span>
        )}
      </div>
      {/* Sparkle accent for current */}
      {state === "current" && (
        <Sparkles
          size={14}
          className="absolute -top-1 -right-1 text-warning fill-warning animate-pulse drop-shadow-md z-20"
        />
      )}
    </div>
  );
}

function NodeLabel({
  title,
  state,
  selected,
}: {
  title: string;
  state: NodeState;
  selected: boolean;
}) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-center pointer-events-none max-w-[180px] text-xs font-semibold leading-tight z-10">
      <p
        className={cn(
          "truncate transition-colors",
          state === "future"
            ? "text-on-surface-variant/60"
            : selected
              ? "text-primary"
              : "text-on-surface"
        )}
      >
        {title}
      </p>
    </div>
  );
}
