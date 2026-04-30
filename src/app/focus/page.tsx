"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Pause, Play, Check } from "lucide-react";

const WORK_S = 25 * 60;
const BREAK_S = 5 * 60;
type Phase = "work" | "break";

// Atlas dark palette — mirrored 1:1 from design/atlas.jsx AS_DARK.
const T = {
  bg: "#0c1117",
  panel: "#11161e",
  border: "#212a36",
  fg: "#e8edf3",
  dim: "#8a96a6",
  ai: "#22d3ee",
  font: "'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};

function todayKey() {
  return `nudg-pomodoros-${new Date().toISOString().slice(0, 10)}`;
}

function FocusTimer() {
  const params = useSearchParams();
  const router = useRouter();
  const title = params.get("title") ?? "Focus session";
  const taskId = params.get("taskId");
  const deliverableTitle = params.get("deliverableTitle") ?? "";
  const initialStartStep = params.get("startStep") ?? "";

  const [phase, setPhase] = useState<Phase>("work");
  const [seconds, setSeconds] = useState(WORK_S);
  const [running, setRunning] = useState(false);
  const [todayDone, setTodayDone] = useState(0);
  const [startStep, setStartStep] = useState(initialStartStep);

  useEffect(() => {
    const v = window.localStorage.getItem(todayKey());
    setTodayDone(v ? Number.parseInt(v, 10) || 0 : 0);
  }, []);

  // Fallback: if URL didn't carry startStep (direct link or pre-enrichment
  // click), ask the server to enrich. Endpoint is idempotent.
  useEffect(() => {
    if (startStep || !taskId) return;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}/enrich`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const s = data?.task?.metadata?.start_step;
        if (typeof s === "string") setStartStep(s);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [taskId, startStep]);

  const total = phase === "work" ? WORK_S : BREAK_S;
  const progress = (total - seconds) / total;

  const switchPhase = useCallback(() => {
    setPhase((p) => {
      const next: Phase = p === "work" ? "break" : "work";
      if (p === "work") {
        setTodayDone((n) => {
          const v = n + 1;
          window.localStorage.setItem(todayKey(), String(v));
          return v;
        });
      }
      setSeconds(next === "work" ? WORK_S : BREAK_S);
      return next;
    });
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => { if (s <= 1) { switchPhase(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [running, switchPhase]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setRunning((r) => !r); }
      else if (e.key === "Escape") router.back();
      else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); switchPhase(); }
      else if (e.key === "r" || e.key === "R") {
        setRunning(false);
        setSeconds(phase === "work" ? WORK_S : BREAK_S);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router, switchPhase, phase]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const RING = 280;
  const STROKE = 3;
  const R = (RING - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const phaseLabel = phase === "work" ? "Focus" : "Break";
  const subtle = phase === "work" ? "stay focused" : "take a breath";

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: T.bg,
        color: T.fg,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        backgroundImage: `radial-gradient(ellipse 60% 50% at 50% 30%, ${T.ai}10, transparent 70%)`,
      }}
      className="select-none"
    >
      {/* Top bar — focus block count + esc hint */}
      <div style={{ padding: "18px 28px", display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: T.dim, fontFamily: T.mono }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, background: `${T.ai}15`, color: T.ai }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.ai, boxShadow: `0 0 6px ${T.ai}` }} />
          Focus block · {String(todayDone).padStart(2, "0")} today
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: T.dim, background: "none", border: "none",
            cursor: "pointer", fontSize: 11, fontFamily: T.mono,
          }}
        >
          <ArrowLeft size={12} /> esc · exit
        </button>
      </div>

      {/* Center column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, color: T.dim, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
          Working on{deliverableTitle ? ` · ${deliverableTitle}` : ""}
        </div>
        <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-.025em", maxWidth: 880, lineHeight: 1.15, color: T.fg }}>
          {title}
        </div>

        {/* Ring + timer */}
        <div style={{ marginTop: 48, position: "relative", width: RING, height: RING }}>
          <svg width={RING} height={RING} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke={T.border} strokeWidth={STROKE} />
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              stroke={T.ai}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke .4s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                fontVariantNumeric: "tabular-nums",
                fontSize: 84,
                fontWeight: 600,
                letterSpacing: "-.04em",
                lineHeight: 1,
                color: T.fg,
              }}
            >
              {mm}<span style={{ color: T.dim }}>:</span>{ss}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: T.dim, letterSpacing: ".18em", textTransform: "uppercase", fontFamily: T.mono }}>
              {phaseLabel} · {subtle}
            </div>
          </div>
        </div>

        {/* Start step card — only meaningful during work phase */}
        {phase === "work" && startStep && (
          <div
            style={{
              marginTop: 36,
              padding: "16px 22px",
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              maxWidth: 640,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              textAlign: "left",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${T.ai}15`, color: T.ai,
                display: "grid", placeItems: "center",
                flexShrink: 0, fontWeight: 700,
              }}
            >
              1
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.ai, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" }}>
                Start step
              </div>
              <div style={{ marginTop: 3, fontSize: 14, lineHeight: 1.4, color: T.fg }}>
                {startStep}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls — Atlas pill style */}
      <div style={{ padding: "24px 28px", display: "flex", justifyContent: "center", gap: 10 }}>
        <PillButton
          icon={<RotateCcw size={12} />}
          label="Reset"
          shortcut="R"
          onClick={() => { setRunning(false); setSeconds(phase === "work" ? WORK_S : BREAK_S); }}
        />
        <PillButton
          icon={running ? <Pause size={12} /> : <Play size={12} />}
          label={running ? "Pause" : seconds === total ? "Start" : "Resume"}
          shortcut="Space"
          onClick={() => setRunning((r) => !r)}
        />
        <PillButton
          icon={<Check size={12} />}
          label="Complete"
          shortcut="⌘⏎"
          onClick={switchPhase}
        />
      </div>
    </div>
  );
}

function PillButton({
  icon, label, shortcut, onClick,
}: { icon: React.ReactNode; label: string; shortcut: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        color: T.fg,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: T.font,
        transition: "background-color .15s ease, border-color .15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#33404f"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
    >
      {icon} {label}
      <span style={{ color: T.dim, fontFamily: T.mono, fontSize: 10 }}>{shortcut}</span>
    </button>
  );
}

export default function FocusPage() {
  return <Suspense><FocusTimer /></Suspense>;
}
