"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PlanResponse, AIWeekPlan } from "@/types";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type Step = "input" | "validating" | "result";

const FILTER_LABELS = {
  externally_verifiable: "Externally verifiable",
  week_arc: "1–12 week arc",
  professionally_valuable: "Professionally valuable",
  user_controlled: "User-controlled",
};

const FILTER_DESCRIPTIONS = {
  externally_verifiable: "Produces a URL, repo, file, or link others can review",
  week_arc: "Each week yields a submittable artifact",
  professionally_valuable: "Builds toward career or business outcomes",
  user_controlled: "Outcome depends on your work, not others' decisions",
};

export default function NewGoalPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [goalText, setGoalText] = useState("");
  const [durationHint, setDurationHint] = useState<number | undefined>(undefined);
  const [planResult, setPlanResult] = useState<PlanResponse | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    if (!goalText.trim()) return;

    setStep("validating");
    setError(null);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalText, duration_hint: durationHint }),
      });

      if (!res.ok) throw new Error("Failed to validate goal");
      const data: PlanResponse = await res.json();
      setPlanResult(data);
      setStep("result");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  }

  async function handleCreateGoal() {
    if (!planResult?.plan) return;
    setCreating(true);

    try {
      const plan = planResult.plan;
      const deliverables = plan.weeks.map((week: AIWeekPlan) => ({
        week_number: week.week_number,
        title: week.deliverable_title,
        description: week.deliverable_description,
        outcome_description: week.outcome_description,
        tasks: week.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          estimated_hours: t.estimated_hours,
        })),
      }));

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: plan.goal_title,
          description: plan.goal_description,
          duration_weeks: plan.duration_weeks,
          ai_plan: plan,
          deliverables,
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");
      const { goal } = await res.json();
      router.push(`/goals/${goal.id}`);
    } catch (err) {
      setError("Failed to create goal. Please try again.");
      setCreating(false);
    }
  }

  function toggleWeek(weekNum: number) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  }

  // ── Input step ────────────────────────────────────────────
  if (step === "input" || step === "validating") {
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <Link href="/dashboard">
          <button className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors">
            <ArrowLeft size={14} />
            Back to dashboard
          </button>
        </Link>

        <h1 className="text-2xl font-bold text-text-primary mb-2">Set your goal</h1>
        <p className="text-text-muted mb-8">
          Describe what you want to build or accomplish. Be specific — the AI will
          validate it against our 4 filters and build your weekly plan.
        </p>

        {/* 4 Filters explainer */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <div key={key} className="bg-surface border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-text-primary mb-0.5">{label}</p>
              <p className="text-xs text-text-muted">
                {FILTER_DESCRIPTIONS[key as keyof typeof FILTER_DESCRIPTIONS]}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleValidate} className="space-y-4">
          <Textarea
            label="Your goal"
            rows={4}
            placeholder={`e.g. "Build and deploy a full-stack AI SaaS app in 6 weeks"\n"Launch an open-source tool on GitHub and get 10 stars in 4 weeks"`}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            hint="Be specific. Vague goals fail the validation filters."
          />

          {/* Duration hint */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Preferred duration (optional)
            </label>
            <div className="flex gap-2 flex-wrap">
              {[2, 4, 6, 8, 12].map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setDurationHint(durationHint === weeks ? undefined : weeks)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-all",
                    durationHint === weeks
                      ? "bg-primary-muted border-primary/50 text-primary-light"
                      : "bg-surface border-border text-text-muted hover:border-border-2 hover:text-text-primary"
                  )}
                >
                  {weeks} weeks
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={step === "validating"}
            fullWidth
            className="mt-2"
          >
            <Sparkles size={16} />
            {step === "validating" ? "Validating & planning..." : "Validate & generate plan"}
          </Button>
        </form>
      </div>
    );
  }

  // ── Result step ────────────────────────────────────────────
  if (step === "result" && planResult) {
    const { validation, plan } = planResult;

    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <button
          onClick={() => setStep("input")}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Edit goal
        </button>

        {/* Goal text recap */}
        <div className="bg-surface-2 border border-border rounded-xl p-4 mb-6">
          <p className="text-xs text-text-muted mb-1">Your goal</p>
          <p className="text-sm text-text-primary">{goalText}</p>
        </div>

        {/* Validation result */}
        <div
          className={cn(
            "rounded-xl p-5 mb-6 border",
            validation.valid
              ? "bg-success-muted border-success/30"
              : "bg-danger-muted border-danger/30"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            {validation.valid ? (
              <CheckCircle2 size={18} className="text-success" />
            ) : (
              <XCircle size={18} className="text-danger" />
            )}
            <span
              className={cn(
                "font-semibold text-sm",
                validation.valid ? "text-success" : "text-danger"
              )}
            >
              {validation.valid
                ? `Goal valid — ${validation.score}/4 filters passed`
                : `Goal needs work — ${validation.score}/4 filters passed`}
            </span>
          </div>

          {/* Filter breakdown */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(FILTER_LABELS).map(([key, label]) => {
              const passed = validation.filters[key as keyof typeof validation.filters];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg",
                    passed
                      ? "text-success bg-success/10"
                      : "text-danger bg-danger/10"
                  )}
                >
                  {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {label}
                </div>
              );
            })}
          </div>

          <p
            className={cn(
              "text-sm",
              validation.valid ? "text-success/80" : "text-danger/80"
            )}
          >
            {validation.feedback}
          </p>

          {validation.suggested_rewrite && (
            <div className="mt-3 pt-3 border-t border-danger/20">
              <p className="text-xs text-text-muted mb-1">Suggested rewrite:</p>
              <button
                onClick={() => {
                  setGoalText(validation.suggested_rewrite!);
                  setStep("input");
                }}
                className="text-sm text-text-primary hover:text-primary-light transition-colors text-left"
              >
                &ldquo;{validation.suggested_rewrite}&rdquo; →
              </button>
            </div>
          )}
        </div>

        {/* Weekly plan */}
        {plan && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-text-primary">{plan.goal_title}</h2>
              <p className="text-sm text-text-muted mt-1">{plan.goal_description}</p>
              <p className="text-xs text-text-muted mt-2 font-mono">
                {plan.duration_weeks} weeks · {plan.weeks.length} deliverables
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {plan.weeks.map((week: AIWeekPlan) => {
                const isExpanded = expandedWeeks.has(week.week_number);
                const totalHours = week.tasks.reduce(
                  (sum, t) => sum + (t.estimated_hours ?? 0),
                  0
                );

                return (
                  <div
                    key={week.week_number}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                  >
                    {/* Week header */}
                    <button
                      onClick={() => toggleWeek(week.week_number)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-2 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary-muted rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-light">
                          W{week.week_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {week.deliverable_title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          ~{totalHours}h · {week.tasks.length} tasks
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-text-muted shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-text-muted shrink-0" />
                      )}
                    </button>

                    {/* Week details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        <p className="text-xs text-text-muted mt-3 mb-1">Deliverable</p>
                        <p className="text-sm text-text-primary mb-2">
                          {week.deliverable_description}
                        </p>
                        <div className="bg-primary-muted border border-primary/20 rounded-lg px-3 py-2 mb-4">
                          <p className="text-xs text-text-muted mb-0.5">What counts as done</p>
                          <p className="text-xs text-primary-light">{week.outcome_description}</p>
                        </div>

                        <p className="text-xs text-text-muted mb-2">Tasks</p>
                        <div className="space-y-2">
                          {week.tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 bg-surface-2 rounded-lg p-2.5"
                            >
                              <div className="w-5 h-5 border-2 border-border rounded-md shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-text-primary">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-text-muted mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-text-muted shrink-0 font-mono">
                                {task.estimated_hours}h
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateGoal}
              loading={creating}
              fullWidth
            >
              Start this goal →
            </Button>
          </>
        )}

        {/* Invalid — offer to retry */}
        {!validation.valid && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setStep("input")}
            fullWidth
          >
            Revise my goal
          </Button>
        )}
      </div>
    );
  }

  return null;
}
