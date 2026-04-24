"use client";

import { useState } from "react";
import { Timer, X } from "lucide-react";

export function DeepWorkCard() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [intervalRef, setIntervalRef] = useState<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setActive(true);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(id); setActive(false); return 25 * 60; }
        return s - 1;
      });
    }, 1000);
    setIntervalRef(id);
  };

  const stop = () => {
    if (intervalRef) clearInterval(intervalRef);
    setActive(false);
    setSeconds(25 * 60);
    setIntervalRef(null);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="bg-neutral rounded-2xl p-5 text-on-neutral">
      <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl mx-auto mb-3">
        <Timer size={20} />
      </div>
      <h3 className="text-base font-black text-center mb-1">
        {active ? `${mm}:${ss}` : "Deep Work"}
      </h3>
      <p className="text-xs text-on-neutral/60 text-center leading-relaxed mb-4">
        {active ? "Focus session in progress. You've got this." : "Minimize distractions for this deliverable."}
      </p>
      {active ? (
        <button onClick={stop} className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/20 text-sm font-semibold py-2.5 rounded-xl transition-colors">
          <X size={14} /> End Session
        </button>
      ) : (
        <button onClick={start} className="w-full bg-primary text-on-primary text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity">
          Start Focus Timer
        </button>
      )}
    </div>
  );
}
