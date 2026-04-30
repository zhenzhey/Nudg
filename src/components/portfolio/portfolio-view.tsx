"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

export interface PortfolioCaseStudy {
  id: string;
  name: string;
  shippedAt: string;
  cycleDays: number | null;
  focusHours: number;
  taskCount: number;
}

interface PortfolioViewProps {
  username: string;
  shippedCount: number;
  streak: number;
  focusHours: number;
  taskCount: number;
  heatmap: number[];
  heatmapStart: string;
  heatmapEnd: string;
  caseStudies: PortfolioCaseStudy[];
}

// Skill radar uses hardcoded sample data — no skill tracking exists in the
// schema yet. Replace with derived data once a skills system is added.
const SAMPLE_SKILLS: { name: string; value: number }[] = [
  { name: "AI/LLM", value: 0.92 },
  { name: "Product", value: 0.78 },
  { name: "Design", value: 0.65 },
  { name: "Engineering", value: 0.85 },
  { name: "Writing", value: 0.55 },
  { name: "Research", value: 0.7 },
];
const TOP_SKILL = "AI/LLM";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatShortDate(iso: string): string {
  // Parse as UTC and format in UTC so a "2026-04-28" key shows as "Apr 28"
  // regardless of the viewer's timezone (matches the heatmap's UTC bucketing).
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCycle(days: number | null): string {
  if (days == null) return "—";
  if (days < 14) return `${days}d`;
  const weeks = days / 7;
  return weeks % 1 === 0 ? `${weeks}w` : `${weeks.toFixed(1)}w`;
}

export function PortfolioView({
  username,
  shippedCount,
  streak,
  focusHours,
  taskCount,
  heatmap,
  heatmapStart,
  heatmapEnd,
  caseStudies,
}: PortfolioViewProps) {
  const [copied, setCopied] = useState(false);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmap), [heatmap]);

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  function handleExport() {
    if (typeof window !== "undefined") window.print();
  }

  const metrics: { key: string; value: string; color: string }[] = [
    { key: "Shipped", value: pad2(shippedCount), color: "text-atlas-done" },
    { key: "Streak", value: `${streak}d`, color: "text-atlas-ai" },
    { key: "Focus hours", value: String(focusHours), color: "text-atlas-fg" },
    { key: "Tasks", value: String(taskCount), color: "text-atlas-fg" },
    { key: "Top skill", value: TOP_SKILL, color: "text-atlas-ai" },
  ];

  return (
    <div className="flex-1 overflow-auto px-8 py-7">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-atlas-border pb-5">
        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-atlas-ai font-semibold">
            Public profile
          </div>
          <div className="text-[42px] font-bold tracking-[-0.028em] mt-1.5 leading-none">
            {username}
            <span className="text-atlas-dim font-normal"> · proof of work</span>
          </div>
          <div className="text-atlas-dim mt-2 max-w-[520px] text-[13px]">
            {shippedCount} project{shippedCount === 1 ? "" : "s"} shipped ·{" "}
            {SAMPLE_SKILLS.length} skills tracked · {username}@nudg
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 border border-atlas-border bg-atlas-panel rounded-md text-[12px] text-atlas-dim hover:text-atlas-fg transition-colors"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-atlas-fg text-atlas-bg rounded-md text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-5 gap-2.5 mt-[18px]">
        {metrics.map((m) => (
          <div
            key={m.key}
            className="px-4 py-3.5 border border-atlas-border rounded-[10px] bg-atlas-panel"
          >
            <div className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
              {m.key}
            </div>
            <div
              className={`text-[26px] font-semibold tracking-[-0.02em] mt-1 ${m.color}`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Radar + activity */}
      <div className="grid grid-cols-[1fr_1.5fr] gap-3.5 mt-3.5">
        {/* Radar */}
        <div className="p-[18px] border border-atlas-border rounded-[10px] bg-atlas-panel">
          <div className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold mb-1.5">
            Skill radar
          </div>
          <div className="grid place-items-center py-2">
            <SkillRadar skills={SAMPLE_SKILLS} size={240} />
          </div>
          <div className="text-[11px] text-atlas-dim text-center mt-1.5">
            Sample data · skill tracking coming soon
          </div>
        </div>

        {/* Activity heatmap */}
        <div className="p-[18px] border border-atlas-border rounded-[10px] bg-atlas-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
              Build activity · last {heatmap.length} days
            </div>
            <div className="text-[11px] text-atlas-dim font-mono">
              {taskCount} tasks · {focusHours} focus hours
            </div>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(15, 1fr)" }}>
            {heatmap.map((v, i) => {
              const ratio = v / heatmapMax;
              const lvl =
                v === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.8 ? 3 : 4;
              const op = [0.08, 0.3, 0.55, 0.78, 1][lvl];
              return (
                <div
                  key={i}
                  className="bg-atlas-ai rounded-[3px]"
                  style={{ aspectRatio: "1", opacity: op }}
                  title={`${v} task${v === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-atlas-dim font-mono">
            <span>{formatShortDate(heatmapStart)}</span>
            <span className="flex items-center gap-1">
              less{" "}
              <span className="flex gap-0.5">
                {[0.1, 0.3, 0.55, 0.8, 1].map((o, i) => (
                  <span
                    key={i}
                    className="bg-atlas-ai rounded-[2px]"
                    style={{ width: 10, height: 10, opacity: o }}
                  />
                ))}
              </span>{" "}
              more
            </span>
            <span>{formatShortDate(heatmapEnd)}</span>
          </div>
        </div>
      </div>

      {/* Case studies */}
      <div className="mt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="text-[10px] tracking-[0.12em] uppercase text-atlas-dim font-semibold">
            Case studies · {caseStudies.length} shipped
          </div>
          <div className="flex-1 h-px bg-atlas-border" />
        </div>
        {caseStudies.length === 0 ? (
          <div className="px-5 py-10 border border-dashed border-atlas-border rounded-[10px] bg-atlas-panel text-center text-atlas-dim text-[13px]">
            No shipped projects yet — finish a project to grow your portfolio.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3.5">
            {caseStudies.map((p) => (
              <CaseStudyCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaseStudyCard({ project }: { project: PortfolioCaseStudy }) {
  return (
    <div className="border border-atlas-border rounded-[10px] bg-atlas-panel overflow-hidden">
      <CaseStudyCover name={project.name} />
      <div className="p-3.5">
        <div className="text-[10px] tracking-[0.12em] uppercase text-atlas-done font-semibold flex items-center gap-1.5">
          <Check size={10} /> Shipped {formatShortDate(project.shippedAt)}
        </div>
        <div className="text-[16px] font-semibold mt-1 tracking-[-0.012em]">
          {project.name}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-atlas-border text-[11px] text-atlas-dim">
          <CaseStudyStat label="Cycle" value={formatCycle(project.cycleDays)} />
          <CaseStudyStat label="Focus" value={`${project.focusHours}h`} />
          <CaseStudyStat label="Tasks" value={String(project.taskCount)} />
        </div>
      </div>
    </div>
  );
}

function CaseStudyStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.1em] uppercase">{label}</div>
      <div className="text-atlas-fg font-mono mt-0.5">{value}</div>
    </div>
  );
}

// Stylized cover — no real screenshots in the data model, so we render an
// abstract cover that echoes the design's Placeholder helper.
function CaseStudyCover({ name }: { name: string }) {
  const initial = (name.match(/[A-Za-z0-9]/)?.[0] ?? "·").toUpperCase();
  return (
    <div
      className="relative h-[140px] bg-atlas-panel-2 border-b border-atlas-border overflow-hidden"
      aria-hidden
    >
      <svg className="absolute inset-0" width="100%" height="100%">
        <defs>
          <pattern id={`csgrid-${initial}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#e3e7ec" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#csgrid-${initial})`} />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 35%, rgba(8,145,178,0.18), transparent 55%)",
        }}
      />
      <div className="absolute left-3.5 bottom-3 text-[42px] font-bold tracking-[-0.04em] leading-none text-atlas-fg/80">
        {initial}
      </div>
    </div>
  );
}

// ── Skill radar ─────────────────────────────────────────────────────────
function SkillRadar({
  skills,
  size,
}: {
  skills: { name: string; value: number }[];
  size: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = skills.length;

  function pt(i: number, rad: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad];
  }

  const rings = [0.25, 0.5, 0.75, 1];
  const polygonPoints = skills
    .map((s, i) => pt(i, r * s.value).join(","))
    .join(" ");

  return (
    <svg width={size} height={size} className="overflow-visible">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={skills.map((_, i) => pt(i, r * ring).join(",")).join(" ")}
          fill="none"
          stroke="#e3e7ec"
          strokeWidth="1"
        />
      ))}
      {skills.map((_, i) => {
        const [x, y] = pt(i, r);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#e3e7ec"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={polygonPoints}
        fill="rgba(8,145,178,0.15)"
        stroke="#0891b2"
        strokeWidth="1.5"
      />
      {skills.map((s, i) => {
        const [x, y] = pt(i, r * s.value);
        return <circle key={i} cx={x} cy={y} r="3" fill="#0891b2" />;
      })}
      {skills.map((s, i) => {
        const [x, y] = pt(i, r + 14);
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const anchor =
          Math.abs(Math.cos(angle)) < 0.3
            ? "middle"
            : Math.cos(angle) > 0
              ? "start"
              : "end";
        return (
          <text
            key={s.name}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fill="#5b6878"
          >
            {s.name}
          </text>
        );
      })}
    </svg>
  );
}
