"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, SkipForward, ArrowLeft } from "lucide-react";

const WORK_S = 25 * 60;
const BREAK_S = 5 * 60;
type Phase = "work" | "break";

function FocusTimer() {
  const params = useSearchParams();
  const router = useRouter();
  const title = params.get("title") ?? "Focus Session";

  const [phase, setPhase] = useState<Phase>("work");
  const [seconds, setSeconds] = useState(WORK_S);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const total = phase === "work" ? WORK_S : BREAK_S;
  const progress = (total - seconds) / total;

  const switchPhase = useCallback(() => {
    const next: Phase = phase === "work" ? "break" : "work";
    if (phase === "work") setSessions((s) => s + 1);
    setPhase(next);
    setSeconds(next === "work" ? WORK_S : BREAK_S);
    setRunning(false);
  }, [phase]);

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
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const R = 130;
  const C = 2 * Math.PI * R;
  const ringColor = phase === "work" ? "#5E6AD2" : "#22C55E";

  return (
    <main
      style={{ backgroundColor: "#0F172A", minHeight: "100dvh", position: "relative" }}
      className="flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 700px 500px at 50% 50%, ${ringColor}1a 0%, transparent 70%)`,
      }} />

      {/* Back button — top left */}
      <button
        onClick={() => router.back()}
        style={{ position: "absolute", top: 28, left: 28, color: "rgba(255,255,255,0.4)" }}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:!text-white"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Session count — top right */}
      {sessions > 0 && (
        <div style={{ position: "absolute", top: 32, right: 32, color: "rgba(255,255,255,0.35)", fontSize: 13 }}
          className="flex items-center gap-1.5">
          <span>✓</span>
          <span>{sessions} session{sessions > 1 ? "s" : ""} done</span>
        </div>
      )}

      {/* Phase badge */}
      <div className="mb-5 px-4 py-1.5 rounded-full" style={{
        border: `1px solid ${ringColor}50`,
        backgroundColor: `${ringColor}18`,
      }}>
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ringColor }}>
          {phase === "work" ? "Focus Session" : "Short Break"}
        </span>
      </div>

      {/* Deliverable title */}
      <p className="mb-12 max-w-sm text-center px-8 leading-relaxed"
        style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
        {title}
      </p>

      {/* Ring + timer */}
      <div style={{ position: "relative", width: 300, height: 300, marginBottom: 48 }}
        className="flex items-center justify-center">
        <svg width={300} height={300} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={150} cy={150} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
          <circle cx={150} cy={150} r={R} fill="none"
            stroke={ringColor} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>
        <div className="flex flex-col items-center gap-2">
          <span className="font-black tabular-nums"
            style={{ fontSize: "4.5rem", lineHeight: 1, color: "#fff", letterSpacing: "-0.03em" }}>
            {mm}:{ss}
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
            {phase === "work" ? "stay focused" : "take a breath"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        {/* Reset */}
        <button
          onClick={() => { setRunning(false); setSeconds(phase === "work" ? WORK_S : BREAK_S); }}
          className="flex items-center justify-center rounded-full transition-all"
          style={{ width: 52, height: 52, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
        >
          <RotateCcw size={20} />
        </button>

        {/* Play / Pause — large */}
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex items-center justify-center rounded-full transition-all"
          style={{
            width: 80, height: 80,
            backgroundColor: ringColor,
            boxShadow: `0 0 48px ${ringColor}60`,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          {running
            ? <Pause size={30} fill="white" color="white" />
            : <Play size={30} fill="white" color="white" style={{ marginLeft: 3 }} />
          }
        </button>

        {/* Skip */}
        <button
          onClick={switchPhase}
          className="flex items-center justify-center rounded-full transition-all"
          style={{ width: 52, height: 52, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
        >
          <SkipForward size={20} />
        </button>
      </div>

      <p className="mt-8" style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
        Space to pause · Esc to exit
      </p>
    </main>
  );
}

export default function FocusPage() {
  return <Suspense><FocusTimer /></Suspense>;
}
