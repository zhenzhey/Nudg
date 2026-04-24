"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  InterviewAnswer,
  InterviewDimension,
  InterviewQuestion,
} from "@/types";
import { ArrowLeft, ArrowRight, Send, Sparkles } from "lucide-react";

const DIMENSION_LABELS: Record<InterviewDimension, string> = {
  baseline: "Baseline",
  definition_of_done: "Done when",
  constraints: "Constraints",
};

interface Props {
  goalText: string;
  questions: InterviewQuestion[];
  onComplete: (answers: InterviewAnswer[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function ClarificationInterview({
  goalText,
  questions,
  onComplete,
  onSkip,
  onBack,
}: Props) {
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const idx = answers.length;
  const current = questions[idx];
  const done = idx >= questions.length;

  useEffect(() => {
    if (done) {
      const t = window.setTimeout(() => onComplete(answers), 400);
      return () => window.clearTimeout(t);
    }
  }, [done, answers, onComplete]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [answers.length]);

  function submitAnswer(answer: string, optionIndex: number | null) {
    if (!current) return;
    const text = answer.trim();
    if (!text) return;
    setAnswers((prev) => [
      ...prev,
      {
        question: current.question,
        dimension: current.dimension,
        answer: text,
        selected_option_index: optionIndex,
      },
    ]);
    setDraft("");
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 py-8 overflow-hidden">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed-dim rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-surface-variant rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col gap-3">
        {/* Top controls — back / progress / skip (outside the card, lighter) */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors font-medium"
          >
            <ArrowLeft size={13} />
            Edit idea
          </button>
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i < idx
                    ? "w-5 bg-primary"
                    : i === idx
                    ? "w-5 bg-primary/50"
                    : "w-2.5 bg-outline-variant/50"
                )}
              />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Chat window — clear card with header + body + input */}
        <div className="flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-[0px_12px_32px_rgba(17,48,105,0.08)] overflow-hidden">
          {/* Window header with goal */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container border-b border-outline-variant/30">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Clarification
              </p>
              <p className="text-xs text-on-surface-variant truncate">
                Tuning plan for{" "}
                <span className="italic text-on-surface">&ldquo;{goalText}&rdquo;</span>
              </p>
            </div>
          </div>

          {/* Transcript */}
          <div
            ref={scrollerRef}
            style={{ height: 340 }}
            className="flex flex-col gap-5 px-4 py-5 overflow-y-auto bg-surface-container-lowest"
          >
            {answers.map((a, i) => (
              <div key={i} className="flex flex-col gap-3">
                {/* AI bubble */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0 mt-0.5">
                    <Sparkles size={12} />
                  </div>
                  <div className="max-w-[80%] bg-surface-container border border-outline-variant/30 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
                    <div className="mb-1">
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-on-tertiary-container bg-tertiary-container px-1.5 py-0.5 rounded">
                        {DIMENSION_LABELS[a.dimension]}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-snug">{a.question}</p>
                  </div>
                </div>
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-primary text-on-primary rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-snug shadow-sm">
                    {a.answer}
                  </div>
                </div>
              </div>
            ))}

            {current && (
              <div className="flex flex-col gap-2 animate-slide-up">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0 mt-0.5">
                    <Sparkles size={12} />
                  </div>
                  <div className="max-w-[80%] bg-surface-container border border-outline-variant/30 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
                    <div className="mb-1">
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-on-tertiary-container bg-tertiary-container px-1.5 py-0.5 rounded">
                        {DIMENSION_LABELS[current.dimension]}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-snug font-medium">
                      {current.question}
                    </p>
                  </div>
                </div>
                {/* Chip row */}
                <div className="flex flex-wrap gap-1.5 pl-9">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => submitAnswer(opt, i)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-container-lowest hover:bg-primary hover:text-on-primary hover:border-primary border border-outline-variant/50 text-on-surface transition-all shadow-sm"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {done && (
              <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant py-3">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating your plan
                <ArrowRight size={14} />
              </div>
            )}
          </div>

          {/* Input bar — inside the card, flex row with embedded send */}
          {current && (
            <div className="border-t border-outline-variant/30 bg-surface-container px-3 py-2.5">
              <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all pl-3.5 pr-1.5 py-1">
                <textarea
                  rows={1}
                  placeholder="Or type your own answer…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer(draft, null);
                    }
                  }}
                  className="flex-1 min-w-0 py-2 bg-transparent text-on-surface text-sm outline-none resize-none leading-snug placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={() => submitAnswer(draft, null)}
                  className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
