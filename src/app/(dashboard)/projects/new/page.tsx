"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PlanResponse, AIWeekPlan, VerificationType } from "@/types";
import { VERIFICATION_TYPE_LABELS } from "@/types";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  GripVertical,
  Calendar,
  Zap,
  Mail,
  ChevronRight,
  Search,
  ArrowRight,
  Lightbulb,
  Globe,
  Code2,
} from "lucide-react";

type Step = "input" | "validating" | "validation_failed" | "review";

interface DeliverableInput {
  id: string;
  title: string;
  description: string;
  verification_type: VerificationType;
  tasks: { title: string; estimated_hours: number }[];
}

const FILTER_LABELS: Record<string, string> = {
  externally_verifiable: "Externally verifiable",
  week_arc: "1–12 week arc",
  professionally_valuable: "Professionally valuable",
  user_controlled: "User-controlled",
};

const FILTER_HINTS: Record<string, string> = {
  externally_verifiable: "What specific link, file, or URL will prove this is done? (e.g. GitHub repo, deployed app, video demo)",
  week_arc: "What would you ship at the end of Week 1? Each week needs a distinct, submittable artifact.",
  professionally_valuable: "How does this connect to your career or business? What skill or portfolio piece will it produce?",
  user_controlled: "Remove any dependency on other people's decisions. Focus on what YOU will build and deliver.",
};

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

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [projectText, setProjectText] = useState("");
  const [durationHint, setDurationHint] = useState<number>(4);
  const [intensity, setIntensity] = useState<"casual" | "steady" | "intense">("steady");
  const [planResult, setPlanResult] = useState<PlanResponse | null>(null);

  // Review step state
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [deliverables, setDeliverables] = useState<DeliverableInput[]>([]);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerAdding, setPartnerAdding] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function callPlan(text: string, hint?: number): Promise<PlanResponse> {
    const res = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: text, duration_hint: hint, intensity }),
    });
    if (!res.ok) throw new Error("API error");
    return res.json();
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!projectText.trim()) return;
    if (projectText.trim().length < 10) {
      setError("Please describe your project in more detail — what exactly will you build or achieve?");
      return;
    }
    setStep("validating");
    setError(null);

    try {
      const data = await callPlan(projectText, durationHint);
      setPlanResult(data);

      if (!data.validation.valid || !data.plan) {
        setStep("validation_failed");
      } else {
        setProjectTitle(data.plan.goal_title);
        setProjectDescription(data.plan.goal_description);
        setDeliverables(
          data.plan.weeks.map((w: AIWeekPlan) => ({
            id: uid(),
            title: w.deliverable_title,
            description: w.deliverable_description,
            verification_type: "manual_upload" as VerificationType,
            tasks: w.tasks.map((t) => ({ title: t.title, estimated_hours: t.estimated_hours })),
          }))
        );
        setStep("review");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  }

  function applySuggestion(text: string) {
    setProjectText(text);
    setStep("input");
  }

  async function handleRegenerate() {
    setError(null);
    try {
      const data = await callPlan(projectText, durationHint);
      setPlanResult(data);
      if (data.plan) {
        setProjectTitle(data.plan.goal_title);
        setProjectDescription(data.plan.goal_description);
        setDeliverables(
          data.plan.weeks.map((w: AIWeekPlan) => ({
            id: uid(),
            title: w.deliverable_title,
            description: w.deliverable_description,
            verification_type: "manual_upload" as VerificationType,
            tasks: w.tasks.map((t) => ({ title: t.title, estimated_hours: t.estimated_hours })),
          }))
        );
      }
    } catch {
      setError("Failed to regenerate. Please try again.");
    }
  }

  function addDeliverable() {
    if (deliverables.length >= 10) return;
    setDeliverables((p) => [
      ...p,
      { id: uid(), title: "", description: "", verification_type: "manual_upload" as VerificationType, tasks: [] },
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
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle,
          description: projectDescription,
          duration_weeks: planResult?.plan?.duration_weeks ?? durationHint ?? 4,
          ai_plan: planResult?.plan ?? null,
          deliverables: valid.map((d, i) => ({
            week_number: i + 1,
            title: d.title,
            description: d.description,
            verification_type: d.verification_type,
            tasks: d.tasks.map(({ title, estimated_hours }) => ({
              title,
              estimated_hours,
              description: "",
            })),
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
  if (step === "input" || step === "validating") {
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
            <div className="relative w-full shadow-[0px_12px_32px_rgba(17,48,105,0.08)] rounded-xl bg-surface-container-lowest border border-outline-variant/20 focus-within:border-outline-variant/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <div className="absolute top-6 left-5 pointer-events-none text-on-surface-variant">
                <Search size={22} />
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
                    if (projectText.trim() && step !== "validating") handleGenerate();
                  }
                }}
                className="w-full pl-14 pr-6 py-6 bg-transparent text-on-surface text-xl outline-none resize-none leading-snug placeholder:text-on-surface-variant/50 rounded-xl"
              />
            </div>

            {/* Controls row — separate from textarea */}
            <div className="flex items-center gap-3">
              {/* Intensity segmented control */}
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-1 shadow-sm gap-0.5">
                {(["Casual", "Steady", "Intense"] as const).map((label) => {
                  const val = label.toLowerCase() as "casual" | "steady" | "intense";
                  const active = intensity === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setIntensity(val)}
                      className={cn(
                        "text-xs font-semibold px-4 py-2 rounded-lg transition-all",
                        active
                          ? val === "intense"
                            ? "bg-warning-container text-on-warning-container shadow-sm"
                            : val === "casual"
                            ? "bg-surface-container-high text-on-surface shadow-sm"
                            : "bg-primary/10 text-primary shadow-sm"
                          : "text-on-surface-variant/50 hover:text-on-surface-variant"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-sm text-xs text-on-surface-variant/70">
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
                disabled={!projectText.trim() || step === "validating"}
                className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dim text-on-primary px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === "validating" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Validating...
                  </>
                ) : (
                  <>
                    Start <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-danger bg-error-container px-4 py-2.5 rounded-xl border border-danger/20">
                {error}
              </p>
            )}
          </form>

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

  // ── Step: validation_failed ──────────────────────────────────
  if (step === "validation_failed" && planResult) {
    const { validation } = planResult;
    const failedFilters = Object.entries(validation.filters).filter(([, passed]) => !passed);

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
              <h2 className="text-lg font-bold text-on-surface">Project needs refinement</h2>
              <p className="text-sm text-on-surface-variant">
                {validation.score}/4 filters passed — fix the issues below and try again.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {Object.entries(FILTER_LABELS).map(([key, label]) => {
              const passed = validation.filters[key as keyof typeof validation.filters];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border",
                    passed
                      ? "bg-success-muted text-success border-success/20"
                      : "bg-error-container text-danger border-danger/20"
                  )}
                >
                  {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {label}
                </div>
              );
            })}
          </div>

          <div className="bg-surface rounded-xl p-4 border border-outline mb-5 shadow-card">
            <p className="text-sm font-semibold text-on-surface mb-1">What went wrong</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{validation.feedback}</p>
          </div>

          {failedFilters.length > 0 && (
            <div className="space-y-3 mb-5">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                How to fix it
              </p>
              {failedFilters.map(([key]) => (
                <div key={key} className="flex gap-3 bg-surface rounded-xl p-4 border border-outline shadow-card">
                  <ChevronRight size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-primary mb-1">{FILTER_LABELS[key]}</p>
                    <p className="text-sm text-on-surface-variant">{FILTER_HINTS[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {validation.suggested_rewrite && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mb-6">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                AI Suggested Rewrite
              </p>
              <p className="text-sm text-on-surface italic leading-relaxed mb-3">
                &ldquo;{validation.suggested_rewrite}&rdquo;
              </p>
              <button
                onClick={() => applySuggestion(validation.suggested_rewrite!)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dim transition-colors"
              >
                Use this suggestion
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
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <RefreshCw size={13} />
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

          {/* Right panel: deliverable grid */}
          <section className="flex-1 overflow-y-auto px-8 py-7 bg-background">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 mb-7 border border-outline/40 shadow-card">
                <Sparkles size={15} className="text-primary shrink-0" />
                <p className="text-sm text-on-surface-variant font-medium">
                  Micro-tasks for each deliverable are <span className="font-semibold text-on-surface">automatically generated</span> and assigned weekly.
                </p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-on-surface">What exactly will you deliver?</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Each deliverable = one week. Min 1, max 10.</p>
                </div>
                <span className="text-xs text-on-surface-variant font-medium bg-surface rounded-full px-3 py-1 border border-outline/40">
                  {deliverables.length}/10
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
                {deliverables.map((d, idx) => (
                  <div key={d.id} className="group bg-surface rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all border border-outline/20 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 shrink-0">
                        <GripVertical size={14} className="text-on-surface-variant/40 cursor-grab" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">W{idx + 1}</span>
                      </div>
                      <button
                        onClick={() => removeDeliverable(d.id)}
                        disabled={deliverables.length <= 1}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-danger transition-all disabled:pointer-events-none disabled:opacity-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <input
                      value={d.title}
                      onChange={(e) => updateDeliverable(d.id, "title", e.target.value)}
                      placeholder="Deliverable title…"
                      className="w-full text-sm font-semibold text-on-surface bg-transparent border-none outline-none placeholder:text-on-surface-variant/40"
                    />
                    <input
                      value={d.description}
                      onChange={(e) => updateDeliverable(d.id, "description", e.target.value)}
                      placeholder="What exactly will you ship? (success criteria)"
                      className="w-full text-xs text-on-surface-variant bg-transparent border-none outline-none placeholder:text-on-surface-variant/40"
                    />
                    <div className="mt-auto pt-1">
                      <select
                        value={d.verification_type}
                        onChange={(e) => updateDeliverable(d.id, "verification_type", e.target.value as VerificationType)}
                        className="text-xs text-on-surface-variant bg-surface-container border border-outline/20 rounded-lg px-2 py-1 focus:outline-none focus:border-primary/40"
                      >
                        {Object.entries(VERIFICATION_TYPE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {deliverables.length < 10 && (
                  <button
                    onClick={addDeliverable}
                    className="bg-transparent border-2 border-dashed border-outline/50 hover:border-primary/50 hover:bg-surface/60 text-on-surface-variant hover:text-primary py-10 rounded-2xl transition-all flex flex-col items-center justify-center gap-2 min-h-[160px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-outline/50">
                      <Plus size={16} />
                    </div>
                    <span className="text-sm font-semibold">Add Deliverable</span>
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-2 text-sm text-danger bg-error-container px-4 py-2.5 rounded-xl border border-danger/20">
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
