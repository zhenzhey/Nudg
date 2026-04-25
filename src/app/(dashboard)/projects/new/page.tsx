"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn, computeDueDates } from "@/lib/utils";
import type {
  PlanResponse,
  AIDeliverable,
  VerificationType,
  InterviewAnswer,
  InterviewQuestion,
} from "@/types";
import Link from "next/link";
import { ClarificationInterview } from "@/components/projects/clarification-interview";
import { PlanLoading } from "@/components/projects/plan-loading";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  XCircle,
  GripVertical,
  Calendar,
  Zap,
  Mail,
  ChevronRight,
  Search,
  ArrowRight,
  ArrowUpRight,
  Lightbulb,
  Globe,
  Code2,
  X,
} from "lucide-react";

type Step =
  | "input"
  | "clarifying_loading"
  | "clarifying"
  | "clarifying_failed"
  | "validating"
  | "feasibility_failed"
  | "review";

type ClarifyStatus = "ok" | "empty" | "truncated" | "rate_limited" | "error";

interface DeliverableInput {
  id: string;
  title: string;
  description: string;
  outcome_description: string;
  estimated_hours: number;
  due_date: string;
  verification_type: VerificationType;
}

const SUGGESTED_PROJECTS = [
  {
    icon: Lightbulb,
    tag: "Hackathon",
    title: "Build for YC Winter 2025",
    description: "Join 500+ builders drafting ideas for the next batch. Focus on AI tooling and DevEx.",
  },
  {
    icon: Globe,
    tag: "Open Source",
    title: "Climate Tech Dashboard",
    description: "Contribute to an open data initiative mapping carbon credits. High demand for React/D3 skills.",
  },
  {
    icon: Code2,
    tag: "Bounty",
    title: "Supabase Auth Plugin",
    description: "Create a custom auth adapter for an enterprise client. $5k bounty attached to completion.",
  },
];

let _counter = 0;
function uid() {
  return `d-${++_counter}-${Math.random().toString(36).slice(2, 6)}`;
}

// Build the review-screen deliverable list from the AI plan, computing
// due_dates from cumulative estimated_hours rather than asking the model.
function buildDeliverableInputs(
  plan: { deliverables: AIDeliverable[]; duration_weeks: number }
): DeliverableInput[] {
  const sorted = [...plan.deliverables].sort((a, b) => a.order_index - b.order_index);
  const dueByIdx = computeDueDates(
    sorted.map((d) => ({ order_index: d.order_index, estimated_hours: d.estimated_hours })),
    new Date(),
    plan.duration_weeks
  );
  return sorted.map((d) => ({
    id: uid(),
    title: d.title,
    description: d.description,
    outcome_description: d.outcome_description,
    estimated_hours: d.estimated_hours,
    due_date: dueByIdx.get(d.order_index) ?? "",
    verification_type: "manual_upload" as VerificationType,
  }));
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [projectText, setProjectText] = useState("");
  const [durationHint, setDurationHint] = useState<number>(4);
  const [intensity, setIntensity] = useState<"casual" | "steady" | "intense">("steady");
  const [planResult, setPlanResult] = useState<PlanResponse | null>(null);

  // Clarification interview
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswer[]>([]);
  const [clarifyStatus, setClarifyStatus] = useState<ClarifyStatus>("ok");
  const [clarifyError, setClarifyError] = useState<string | null>(null);

  // Review step state
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([]);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerAdding, setPartnerAdding] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Regenerate panel state — opens an inline textarea where the user types
  // free-form instructions ("make week 1 lighter") that get passed to the AI.
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDeliverables((items) => {
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIdx, newIdx);
    });
  }

  async function callPlan(
    text: string,
    hint?: number,
    answers?: InterviewAnswer[],
    instructions?: string
  ): Promise<PlanResponse> {
    const res = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: text,
        duration_hint: hint,
        intensity,
        interview: answers,
        instructions: instructions?.trim() || undefined,
      }),
    });
    if (!res.ok) throw new Error("API error");
    return res.json();
  }

  async function runPlanAndRoute(answers: InterviewAnswer[]) {
    setStep("validating");
    setError(null);
    try {
      const data = await callPlan(projectText, durationHint, answers);
      setPlanResult(data);

      if (!data.feasibility.feasible || !data.plan) {
        setStep("feasibility_failed");
      } else {
        setProjectTitle(data.plan.goal_title);
        setProjectDescription(data.plan.goal_description);
        setDeliverables(buildDeliverableInputs(data.plan));
        setStep("review");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!projectText.trim()) return;
    if (projectText.trim().length < 10) {
      setError("Please describe your project in more detail — what exactly will you build or achieve?");
      return;
    }
    setStep("clarifying_loading");
    setError(null);
    setInterviewQuestions([]);
    setInterviewAnswers([]);
    setClarifyStatus("ok");
    setClarifyError(null);

    try {
      const res = await fetch("/api/ai/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: projectText,
          duration_hint: durationHint,
          intensity,
        }),
      });
      if (!res.ok) {
        setClarifyStatus("error");
        setClarifyError(`Clarify API returned ${res.status}`);
        setStep("clarifying_failed");
        return;
      }
      const body = (await res.json()) as {
        questions: InterviewQuestion[];
        status?: ClarifyStatus;
        error?: string;
      };
      const status: ClarifyStatus = body.status ?? (body.questions?.length ? "ok" : "empty");
      setClarifyStatus(status);
      setClarifyError(body.error ?? null);

      if (status !== "ok" || !body.questions || body.questions.length === 0) {
        // Never silently skip to plan — let the user see what happened and decide.
        setStep("clarifying_failed");
        return;
      }
      setInterviewQuestions(body.questions);
      setStep("clarifying");
    } catch (err) {
      setClarifyStatus("error");
      setClarifyError(err instanceof Error ? err.message : "Network error");
      setStep("clarifying_failed");
    }
  }

  function applySuggestion(text: string) {
    setProjectText(text);
    setStep("input");
  }

  async function handleRegenerate(instructions?: string) {
    setError(null);
    setRegenerating(true);
    try {
      const data = await callPlan(
        projectText,
        durationHint,
        interviewAnswers,
        instructions
      );
      setPlanResult(data);
      if (data.plan) {
        setProjectTitle(data.plan.goal_title);
        setProjectDescription(data.plan.goal_description);
        setDeliverables(buildDeliverableInputs(data.plan));
      } else {
        setError("AI couldn't produce a plan with those instructions. Try rephrasing.");
      }
      setRegenOpen(false);
      setRegenInstructions("");
    } catch {
      setError("Failed to regenerate. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }

  function addDeliverable() {
    if (deliverables.length >= 10) return;
    setDeliverables((p) => [
      ...p,
      {
        id: uid(),
        title: "",
        description: "",
        outcome_description: "",
        estimated_hours: 0,
        due_date: "",
        verification_type: "manual_upload" as VerificationType,
      },
    ]);
  }

  function removeDeliverable(id: string) {
    if (deliverables.length <= 1) return;
    setDeliverables((p) => p.filter((d) => d.id !== id));
  }

  function updateDeliverable(id: string, field: keyof DeliverableInput, value: string) {
    setDeliverables((p) => p.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  async function handleLaunch() {
    const valid = deliverables.filter((d) => d.title.trim());
    if (!valid.length) { setError("Add at least one deliverable."); return; }
    if (!projectTitle.trim()) { setError("Project title is required."); return; }
    setCreating(true);
    setError(null);

    try {
      const ordered = valid.map((d, i) => ({ ...d, order_index: i }));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          duration_weeks: planResult?.plan?.duration_weeks ?? durationHint ?? 4,
          ai_plan: planResult?.plan ?? null,
          interview: interviewAnswers.length > 0 ? interviewAnswers : undefined,
          deliverables: ordered.map((d) => ({
            order_index: d.order_index,
            title: d.title,
            description: d.description,
            outcome_description: d.outcome_description || undefined,
            estimated_hours: d.estimated_hours > 0 ? d.estimated_hours : undefined,
            verification_type: d.verification_type,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const { project } = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Failed to launch project. Please try again.");
      setCreating(false);
    }
  }

  // ── Step: input ──────────────────────────────────────────────
  if (step === "input") {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed-dim rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-surface-variant rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
        </div>

        <div className="relative z-10 w-full max-w-3xl space-y-10">
          {/* Hero heading */}
          <h1 className="text-center text-5xl md:text-6xl font-black tracking-tight text-on-background">
            What are you working on?
          </h1>

          {/* Giant input */}
          <form onSubmit={handleGenerate} className="space-y-3">
            {/* Textarea — standalone card */}
            <div className="flex items-start w-full px-6 py-5 gap-3 rounded-2xl border-2 border-outline-variant/20 bg-surface-container-lowest shadow-[0px_12px_32px_rgba(17,48,105,0.08)] focus-within:shadow-[0_0_0_3px_rgba(94,106,210,0.2),0px_12px_32px_rgba(17,48,105,0.08)] transition-shadow">
              <div className="shrink-0 pt-[5px] text-on-surface-variant">
                <Search size={20} />
              </div>
              <textarea
                rows={2}
                autoFocus
                placeholder="Describe your project idea, stack, or goal..."
                value={projectText}
                onChange={(e) => setProjectText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (projectText.trim()) handleGenerate();
                  }
                }}
                className="no-focus-ring flex-1 bg-transparent text-on-surface text-xl leading-snug resize-none appearance-none border-none placeholder:text-on-surface-variant/50"
                style={{ outline: "none", boxShadow: "none", border: "none" }}
              />
            </div>

            {/* Controls row — separate from textarea */}
            <div className="flex items-center gap-3">
              {/* Intensity segmented control */}
              <div className="flex items-center bg-surface-container rounded-xl p-1 gap-0.5">
                {(["Casual", "Steady", "Intense"] as const).map((label) => {
                  const val = label.toLowerCase() as "casual" | "steady" | "intense";
                  const active = intensity === val;
                  const activeColor =
                    val === "intense" ? "text-warning" : val === "casual" ? "text-on-surface" : "text-primary";
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setIntensity(val)}
                      className={cn(
                        "text-xs font-semibold px-4 py-2 rounded-lg transition-all",
                        active
                          ? `bg-surface-container-lowest shadow-sm ${activeColor}`
                          : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-surface-container rounded-xl text-xs">
                <span className="tabular-nums font-semibold text-on-surface">{durationHint}w</span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={durationHint}
                  onChange={(e) => setDurationHint(Number(e.target.value))}
                  className="w-24 h-1 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex-1" />

              {/* Submit */}
              <button
                type="submit"
                disabled={!projectText.trim()}
                className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start <ArrowRight size={14} />
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-danger bg-error-container px-4 py-2.5 rounded-xl border border-danger/20">
                {error}
              </p>
            )}

          </form>

          {/* Dev mock entry — preview the deliverable planning UI without running AI */}
          <div className="flex justify-center">
            <Link
              href="/projects/new/deliverables"
              className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dim transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full border border-primary/20"
            >
              <Sparkles size={12} />
              Preview deliverables page (mock)
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Suggested opportunities */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-on-surface-variant uppercase ml-1">
              Suggested Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SUGGESTED_PROJECTS.map(({ icon: Icon, tag, title, description }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setProjectText(title)}
                  className="text-left bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 hover:bg-surface-container hover:border-outline-variant/30 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                      <Icon size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container">
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: clarifying_loading / validating — multi-step loader ──
  if (step === "clarifying_loading") {
    return <PlanLoading phase="clarifying" goalText={projectText} />;
  }
  if (step === "validating") {
    return (
      <PlanLoading
        phase="planning"
        goalText={projectText}
        answers={interviewAnswers}
      />
    );
  }

  // ── Step: clarifying_failed — clarify returned empty / errored ──
  if (step === "clarifying_failed") {
    const statusCopy: Record<ClarifyStatus, { title: string; body: string }> = {
      ok: { title: "No questions", body: "The model chose not to ask any questions." },
      empty: {
        title: "No questions worth asking",
        body: "The AI decided none of the clarifying questions would meaningfully change the plan for this goal. You can proceed as-is, or edit the idea to add more detail and try again.",
      },
      truncated: {
        title: "AI response was cut off",
        body: "The model's answer got truncated before it finished. Retry — this usually works the second time.",
      },
      rate_limited: {
        title: "Rate limit hit",
        body: "The Gemini free tier allows 20 requests/day and we just hit it. Wait a minute and retry, or upgrade the API key.",
      },
      error: {
        title: "Something went wrong",
        body: "The clarifier didn't return a usable response. Retry, or proceed without clarification.",
      },
    };
    const copy = statusCopy[clarifyStatus];
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed-dim rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-surface-variant rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
        </div>
        <div className="relative z-10 w-full max-w-lg bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-7 shadow-[0px_12px_32px_rgba(17,48,105,0.08)] space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-danger shrink-0">
              <XCircle size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-on-surface">{copy.title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{copy.body}</p>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Your idea
            </p>
            <p className="text-sm text-on-surface italic leading-relaxed line-clamp-2">
              &ldquo;{projectText}&rdquo;
            </p>
          </div>

          {clarifyError && (
            <details className="text-xs text-on-surface-variant">
              <summary className="cursor-pointer hover:text-on-surface font-medium">Technical details</summary>
              <pre className="mt-2 bg-surface-container rounded-lg p-3 text-[11px] text-on-surface-variant whitespace-pre-wrap break-words">
                status: {clarifyStatus}
                {"\n"}
                {clarifyError}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep("input")}
              className="flex-1 flex items-center justify-center gap-2 bg-surface-container text-on-surface font-semibold py-2.5 px-4 rounded-xl transition-colors hover:bg-surface-container-high text-sm border border-outline/40"
            >
              <ArrowLeft size={14} />
              Edit idea
            </button>
            <button
              onClick={() => handleGenerate()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold py-2.5 px-4 rounded-xl transition-colors hover:opacity-90 text-sm"
            >
              <RefreshCw size={14} />
              Retry clarify
            </button>
          </div>
          <button
            onClick={() => {
              setInterviewAnswers([]);
              void runPlanAndRoute([]);
            }}
            className="w-full text-xs text-on-surface-variant hover:text-on-surface transition-colors font-medium"
          >
            Skip clarification and plan anyway
          </button>
        </div>
      </div>
    );
  }

  // ── Step: clarifying — chat-card interview ───────────────────
  if (step === "clarifying") {
    return (
      <ClarificationInterview
        goalText={projectText}
        questions={interviewQuestions}
        onComplete={(answers) => {
          setInterviewAnswers(answers);
          void runPlanAndRoute(answers);
        }}
        onSkip={() => {
          setInterviewAnswers([]);
          void runPlanAndRoute([]);
        }}
        onBack={() => setStep("input")}
      />
    );
  }

  // ── Step: feasibility_failed ─────────────────────────────────
  if (step === "feasibility_failed" && planResult) {
    const { feasibility } = planResult;

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-xl animate-slide-up">
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-8 transition-colors font-medium"
          >
            <ArrowLeft size={15} />
            Edit project
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">This goal doesn&apos;t fit your time budget</h2>
              <p className="text-sm text-on-surface-variant">
                Given your intensity, duration, and the answers you gave, the AI thinks this scope isn&apos;t reachable.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-outline mb-5 shadow-card">
            <p className="text-sm font-semibold text-on-surface mb-1">Why</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{feasibility.reason}</p>
          </div>

          {feasibility.suggested_rescope && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mb-6">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                Suggested rescope
              </p>
              <p className="text-sm text-on-surface italic leading-relaxed mb-3">
                &ldquo;{feasibility.suggested_rescope}&rdquo;
              </p>
              <button
                onClick={() => applySuggestion(feasibility.suggested_rescope!)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dim transition-colors"
              >
                Use this rescope
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-on-surface mb-1.5">
              Edit your project
            </label>
            <textarea
              rows={3}
              value={projectText}
              onChange={(e) => setProjectText(e.target.value)}
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-card"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!projectText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-neutral text-on-neutral font-semibold py-3 px-6 rounded-xl transition-all hover:bg-neutral/90 shadow-sm disabled:opacity-40"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: review — split view ────────────────────────────────
  if (step === "review" && planResult?.plan) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Top bar */}
        <div className="shrink-0 h-12 flex items-center justify-between px-6 bg-surface border-b border-outline/50 shadow-sm z-10">
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium"
          >
            <ArrowLeft size={14} />
            Edit project
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Sparkles size={15} className="text-primary" />
            AI Generated Roadmap
          </div>
          <button
            onClick={() => setRegenOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-colors",
              regenOpen
                ? "text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
            Regenerate
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <aside className="w-[360px] shrink-0 bg-surface border-r border-outline/40 flex flex-col overflow-y-auto">
            <div className="flex-1 px-7 pt-7 pb-6 space-y-6">
              <div>
                <input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full text-[1.6rem] font-black leading-tight tracking-tight text-on-surface bg-transparent outline-none border-b-2 border-transparent focus:border-primary/30 transition-colors pb-0.5 placeholder:text-on-surface-variant/30"
                  placeholder="Project title"
                />
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full mt-3 text-sm text-on-surface-variant bg-transparent outline-none resize-none leading-relaxed placeholder:text-on-surface-variant/40"
                  placeholder="Project description..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-medium border border-outline/50">
                  <Calendar size={11} />
                  {planResult.plan.duration_weeks} Weeks
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-medium border border-outline/50">
                  <Zap size={11} />
                  {deliverables.length} Deliverables
                </span>
              </div>

              {/* Based on your answers */}
              {interviewAnswers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles size={12} className="text-primary" />
                    <h3 className="text-[11px] font-bold text-on-surface tracking-widest uppercase">
                      Based on your answers
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {interviewAnswers.map((a, i) => {
                      const tagLabel =
                        a.dimension === "baseline"
                          ? "Baseline"
                          : a.dimension === "definition_of_done"
                          ? "Done when"
                          : "Constraints";
                      return (
                        <div
                          key={i}
                          className="bg-primary/5 rounded-lg px-3 py-2 border border-primary/15"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-on-tertiary-container bg-tertiary-container/80 px-1.5 py-px rounded">
                              {tagLabel}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-snug line-clamp-1 mb-0.5">
                            {a.question}
                          </p>
                          <p className="text-xs font-semibold text-on-surface leading-snug">
                            {a.answer}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Accountability Partner */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold text-on-surface tracking-widest uppercase">
                    Accountability Partner
                  </h3>
                  {partnerEmail && !partnerAdding && (
                    <button
                      onClick={() => setPartnerAdding(true)}
                      className="text-xs font-semibold text-primary hover:text-primary-dim transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {partnerEmail && !partnerAdding ? (
                  <div className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 border border-outline/30">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {partnerEmail[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{partnerEmail}</p>
                      <p className="text-xs text-on-surface-variant">Invite pending</p>
                    </div>
                  </div>
                ) : partnerAdding ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      autoFocus
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="partner@email.com"
                      className="w-full bg-surface border border-outline rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPartnerAdding(false)}
                        className="flex-1 text-xs font-semibold text-on-surface-variant bg-surface-container border border-outline rounded-lg py-2 hover:bg-surface-container-high transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setPartnerEmail(""); setPartnerAdding(false); }}
                        className="px-3 text-xs font-semibold text-on-surface-variant hover:text-danger transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setPartnerAdding(true)}
                    className="w-full flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 border border-dashed border-outline hover:border-primary/40 hover:bg-surface-container-high transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface border border-outline flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-on-surface-variant" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">Add a partner</p>
                      <p className="text-xs text-on-surface-variant">Invite by email</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Commitment Protocols */}
              <div>
                <h3 className="text-[11px] font-bold text-on-surface tracking-widest uppercase mb-3">
                  Commitment Protocols
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Weekly Check-ins", sub: "Review progress every Friday" },
                    { label: "Public Updates", sub: "Share milestones with peers" },
                  ].map(({ label, sub }) => (
                    <label
                      key={label}
                      className="flex items-start gap-3 p-3 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-outline/30"
                    >
                      <input type="checkbox" defaultChecked className="mt-0.5 w-4 h-4 rounded accent-primary" />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{label}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-7 py-5 border-t border-outline/40 flex gap-3 shrink-0">
              <button
                onClick={() => setStep("input")}
                className="flex-1 bg-surface text-on-surface font-semibold py-2.5 px-4 rounded-xl transition-colors hover:bg-surface-container text-sm border border-outline"
              >
                Save Draft
              </button>
              <button
                onClick={handleLaunch}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 bg-neutral text-on-neutral font-semibold py-2.5 px-4 rounded-xl transition-all hover:bg-neutral/90 text-sm shadow-sm disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Launching...
                  </>
                ) : "Launch Project"}
              </button>
            </div>
          </aside>

          {/* Right panel: vertical timeline */}
          <section className="flex-1 overflow-y-auto px-8 py-7 bg-background">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-on-surface">What exactly will you deliver?</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Drag to reorder ·{" "}
                    {planResult.plan.total_estimated_hours?.toFixed(0) ?? "—"}h total. Min 1, max 10.
                  </p>
                </div>
                <span className="text-xs text-on-surface-variant font-medium bg-surface rounded-full px-3 py-1 border border-outline/40">
                  {deliverables.length}/10
                </span>
              </div>

              {/* Regenerate expandable panel */}
              {regenOpen && (
                <div className="mb-6 bg-surface rounded-2xl border border-primary/30 shadow-card p-5 animate-slide-up">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          Regenerate with instructions
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Tell the AI what to change — scope, pacing, focus, anything.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRegenOpen(false);
                        setRegenInstructions("");
                      }}
                      className="text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    rows={3}
                    value={regenInstructions}
                    onChange={(e) => setRegenInstructions(e.target.value)}
                    placeholder="e.g. Make the first deliverable lighter. Focus more on user research. Drop the billing milestone."
                    className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setRegenOpen(false);
                        setRegenInstructions("");
                      }}
                      className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-4 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRegenerate(regenInstructions)}
                      disabled={!regenInstructions.trim() || regenerating}
                      className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} />
                      {regenerating ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-outline/30" />

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={deliverables.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-3">
                      {deliverables.map((d, idx) => (
                        <TimelineCard
                          key={d.id}
                          deliverable={d}
                          index={idx}
                          canDelete={deliverables.length > 1}
                          onUpdate={updateDeliverable}
                          onRemove={removeDeliverable}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>

                {deliverables.length < 10 && (
                  <div className="relative mt-3 pl-[52px]">
                    <div className="absolute left-[12px] top-4 w-4 h-4 rounded-full border-2 border-dashed border-outline bg-background" />
                    <button
                      onClick={addDeliverable}
                      className="w-full bg-transparent border-2 border-dashed border-outline/50 hover:border-primary/50 hover:bg-surface/60 text-on-surface-variant hover:text-primary py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      <span className="text-sm font-semibold">Add Deliverable</span>
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 text-sm text-danger bg-error-container px-4 py-2.5 rounded-xl border border-danger/20">
                  {error}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return null;
}

function TimelineCard({
  deliverable,
  index,
  canDelete,
  onUpdate,
  onRemove,
}: {
  deliverable: DeliverableInput;
  index: number;
  canDelete: boolean;
  onUpdate: (id: string, field: keyof DeliverableInput, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deliverable.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative pl-[52px] group",
        isDragging && "z-10 opacity-80"
      )}
    >
      <div className="absolute left-[11px] top-5 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-primary to-primary-dim ring-4 ring-background flex items-center justify-center">
        <span className="text-[9px] font-black text-on-primary">{index + 1}</span>
      </div>

      <div
        className={cn(
          "bg-surface rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all border border-outline/20",
          isDragging && "shadow-lg ring-2 ring-primary/30"
        )}
      >
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 mt-1 text-on-surface-variant/40 hover:text-on-surface-variant cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                Deliverable
              </span>
              {deliverable.estimated_hours > 0 && (
                <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                  {deliverable.estimated_hours}h
                </span>
              )}
              {deliverable.due_date && (
                <span className="text-[10px] font-medium text-on-surface-variant">
                  · due {deliverable.due_date}
                </span>
              )}
            </div>
            <input
              value={deliverable.title}
              onChange={(e) => onUpdate(deliverable.id, "title", e.target.value)}
              placeholder="Deliverable title…"
              className="w-full text-sm font-semibold text-on-surface bg-transparent border-none outline-none placeholder:text-on-surface-variant/40"
            />
            <textarea
              value={deliverable.description}
              onChange={(e) => onUpdate(deliverable.id, "description", e.target.value)}
              placeholder="What exactly will you ship? (success criteria)"
              rows={2}
              className="w-full text-xs text-on-surface-variant bg-transparent border-none outline-none resize-none placeholder:text-on-surface-variant/40 leading-relaxed"
            />
          </div>

          <button
            onClick={() => onRemove(deliverable.id)}
            disabled={!canDelete}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-danger transition-all disabled:pointer-events-none disabled:opacity-0 p-1"
            aria-label="Remove deliverable"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}
