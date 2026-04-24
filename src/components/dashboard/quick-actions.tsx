"use client";

import { useState } from "react";
import { Inbox, Plus, Zap, Timer, X } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  inboxCount?: number;
}

export function QuickActions({ inboxCount = 0 }: QuickActionsProps) {
  const [deepWorkActive, setDeepWorkActive] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60); // 25-min pomodoro
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  const toggleDeepWork = () => {
    if (deepWorkActive) {
      if (intervalId) clearInterval(intervalId);
      setIntervalId(null);
      setDeepWorkActive(false);
      setSeconds(25 * 60);
    } else {
      setDeepWorkActive(true);
      const id = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(id);
            setDeepWorkActive(false);
            return 25 * 60;
          }
          return s - 1;
        });
      }, 1000);
      setIntervalId(id);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Inbox */}
      <Link href="/projects">
        <button className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface bg-surface hover:bg-surface-container border border-outline/20 px-3 py-2 rounded-xl font-medium transition-all shadow-kinetic-sm">
          <Inbox size={14} />
          Inbox
          {inboxCount > 0 && (
            <span className="bg-primary text-on-primary text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {inboxCount > 9 ? "9+" : inboxCount}
            </span>
          )}
        </button>
      </Link>

      {/* Quick Event */}
      <Link href="/projects/new">
        <button className="flex items-center gap-1.5 text-sm bg-neutral text-on-neutral hover:opacity-90 px-3 py-2 rounded-xl font-medium transition-all shadow-kinetic-sm">
          <Plus size={14} />
          Quick Event
        </button>
      </Link>

      {/* Deep Work timer */}
      <button
        onClick={toggleDeepWork}
        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium transition-all shadow-kinetic-sm ${
          deepWorkActive
            ? "bg-primary text-on-primary"
            : "bg-surface hover:bg-surface-container border border-outline/20 text-on-surface-variant hover:text-on-surface"
        }`}
      >
        {deepWorkActive ? <Timer size={14} /> : <Zap size={14} />}
        {deepWorkActive ? `${mm}:${ss}` : "Deep Work"}
        {deepWorkActive && (
          <span className="ml-1">
            <X size={12} />
          </span>
        )}
      </button>
    </div>
  );
}
