"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { InterviewAnswer, InterviewDimension } from "@/types";

export type LoadingPhase = "clarifying" | "planning";

const DIMENSION_LABELS: Record<InterviewDimension, string> = {
  baseline: "Baseline",
  definition_of_done: "Done when",
  constraints: "Constraints",
};

interface Step {
  key: string;
  label: string;
  hint: string;
}

const CLARIFY_STEPS: Step[] = [
  {
    key: "read",
    label: "Reading your idea",
    hint: "Parsing what you want to build",
  },
  {
    key: "gap",
    label: "Looking for missing context",
    hint: "Skills, success criteria, constraints",
  },
  {
    key: "ask",
    label: "Preparing questions (only if needed)",
    hint: "If your idea is already specific, we skip this step",
  },
];

const PLAN_STEPS: Step[] = [
  {
    key: "validate",
    label: "Validating the goal",
    hint: "Checking the 4 filters — verifiable, weekly, valuable, yours",
  },
  {
    key: "weeks",
    label: "Breaking it into weekly deliverables",
    hint: "One shippable artifact per week",
  },
  {
    key: "tasks",
    label: "Generating micro-tasks",
    hint: "3–5 concrete actions per week",
  },
];

interface Props {
  phase: LoadingPhase;
  goalText?: string;
  answers?: InterviewAnswer[];
}

export function PlanLoading({ phase, goalText, answers }: Props) {
  const steps = phase === "clarifying" ? CLARIFY_STEPS : PLAN_STEPS;
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Advance through steps but never mark the last one as complete —
    // the network call is still in flight until the parent unmounts us.
    steps.forEach((_, i) => {
      if (i === 0) return;
      timers.push(
        setTimeout(() => setActiveIdx(i), i * 1500)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, steps]);

  const title =
    phase === "clarifying"
      ? "Understanding your idea"
      : "Drafting your weekly plan";
  const subtitle =
    phase === "clarifying"
      ? "We're figuring out if we have enough to plan a strong roadmap — or if a couple of quick questions would sharpen it."
      : "Turning your idea (and answers) into concrete weekly deliverables.";

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
      {/* Background blobs — match input step */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed-dim rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-surface-variant rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 shadow-[0px_12px_32px_rgba(17,48,105,0.08)] space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-on-surface">{title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                {subtitle}
              </p>
            </div>
          </div>

          {goalText && (
            <div className="bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                Your idea
              </p>
              <p className="text-sm text-on-surface italic leading-relaxed line-clamp-2">
                &ldquo;{goalText}&rdquo;
              </p>
            </div>
          )}

          {phase === "planning" && answers && answers.length > 0 && (
            <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/15 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Personalizing with your answers
              </p>
              <ul className="space-y-1.5">
                {answers.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-on-surface leading-snug">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-on-tertiary-container bg-tertiary-container/80 px-1.5 py-px rounded mt-0.5 shrink-0">
                      {DIMENSION_LABELS[a.dimension]}
                    </span>
                    <span className="min-w-0 text-on-surface-variant">
                      <span className="font-medium text-on-surface">{a.answer}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, i) => {
              const done = i < activeIdx;
              const active = i === activeIdx;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      done
                        ? "bg-success-muted text-success"
                        : active
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-container text-on-surface-variant/40 border border-outline-variant/30"
                    )}
                  >
                    {done ? (
                      <Check size={14} strokeWidth={3} />
                    ) : active ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <span className="text-[11px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold transition-colors",
                        done || active
                          ? "text-on-surface"
                          : "text-on-surface-variant/50"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-xs leading-relaxed transition-colors mt-0.5",
                        done || active
                          ? "text-on-surface-variant"
                          : "text-on-surface-variant/40"
                      )}
                    >
                      {step.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
