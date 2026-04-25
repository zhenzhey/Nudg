"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  GripVertical,
  Calendar,
  Zap,
  Mail,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Deliverable {
  id: string;
  title: string;
  description: string;
}

const MOCK_PROJECT = {
  title: "Ship an AI-Powered Dev Tool for YC W25",
  description:
    "Build and launch an AI agent that automates developer workflows. Target early adopters on Twitter and apply to YC Winter 2025 with live users and revenue.",
  duration_weeks: 5,
};

const MOCK_DELIVERABLES: Deliverable[] = [
  {
    id: "d-1",
    title: "Landing page + waitlist live",
    description:
      "Deployed landing page at a custom domain with working email capture. Share link in 3 dev communities.",
  },
  {
    id: "d-2",
    title: "Core agent MVP — single workflow",
    description:
      "Working agent that automates one end-to-end dev task (e.g. PR review). Demo video recorded and posted.",
  },
  {
    id: "d-3",
    title: "10 design-partner interviews",
    description:
      "Conduct 10 user interviews with target devs. Synthesize findings into a written insights doc.",
  },
  {
    id: "d-4",
    title: "Paid beta with 5 users",
    description:
      "Onboard 5 paying beta users. Ship billing integration (Stripe) and working dashboard.",
  },
  {
    id: "d-5",
    title: "YC application submitted",
    description:
      "Complete YC W25 application with demo video, metrics, and founder story. Request 3 referrals.",
  },
];

let _counter = 0;
const uid = () => `d-new-${++_counter}-${Math.random().toString(36).slice(2, 6)}`;

export default function DeliverablesPlanPage() {
  const router = useRouter();

  const [projectTitle, setProjectTitle] = useState(MOCK_PROJECT.title);
  const [projectDescription, setProjectDescription] = useState(
    MOCK_PROJECT.description
  );
  const [deliverables, setDeliverables] = useState<Deliverable[]>(MOCK_DELIVERABLES);

  const [regenOpen, setRegenOpen] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerAdding, setPartnerAdding] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function updateDeliverable(id: string, field: "title" | "description", value: string) {
    setDeliverables((p) => p.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  function addDeliverable() {
    if (deliverables.length >= 10) return;
    setDeliverables((p) => [...p, { id: uid(), title: "", description: "" }]);
  }

  function removeDeliverable(id: string) {
    if (deliverables.length <= 1) return;
    setDeliverables((p) => p.filter((d) => d.id !== id));
  }

  async function handleRegenerate() {
    if (!regenInstructions.trim()) return;
    setRegenerating(true);
    // Mock regeneration — in real flow this would call /api/ai/plan with instructions
    await new Promise((r) => setTimeout(r, 900));
    setDeliverables((prev) =>
      prev.map((d, i) => ({
        ...d,
        description: `[Regenerated based on: "${regenInstructions.slice(0, 40)}${
          regenInstructions.length > 40 ? "…" : ""
        }"] ${d.description}`,
      }))
    );
    setRegenerating(false);
    setRegenOpen(false);
    setRegenInstructions("");
  }

  async function handleConfirm() {
    const valid = deliverables.filter((d) => d.title.trim());
    if (!valid.length) {
      setError("Add at least one deliverable.");
      return;
    }
    if (!projectTitle.trim()) {
      setError("Project title is required.");
      return;
    }
    setConfirming(true);
    setError(null);
    // Mock: next step would generate Week 1 micro-tasks
    await new Promise((r) => setTimeout(r, 600));
    alert(
      "Deliverables confirmed. Next step: generate Week 1 micro-tasks (not wired yet — mock flow)."
    );
    setConfirming(false);
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="shrink-0 h-12 flex items-center justify-between px-6 bg-surface border-b border-outline/50 shadow-sm z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          Edit project
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <Sparkles size={15} className="text-primary" />
          AI Generated Deliverables
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
                {deliverables.length} Weeks
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
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {partnerEmail}
                    </p>
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
                      onClick={() => {
                        setPartnerEmail("");
                        setPartnerAdding(false);
                      }}
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

            {/* Next step hint */}
            <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/15">
              <div className="flex items-start gap-2">
                <Sparkles size={13} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
                    Next step
                  </p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    After you confirm these deliverables, we&apos;ll generate micro-tasks
                    just for Week 1. New weeks unlock as you ship.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-7 py-5 border-t border-outline/40 flex gap-3 shrink-0">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-surface text-on-surface font-semibold py-2.5 px-4 rounded-xl transition-colors hover:bg-surface-container text-sm border border-outline"
            >
              Save Draft
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-primary-dim text-on-primary font-semibold py-2.5 px-4 rounded-xl transition-all hover:opacity-90 text-sm shadow-sm disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Confirming...
                </>
              ) : (
                <>
                  Confirm & Continue
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Right: Timeline */}
        <section className="flex-1 overflow-y-auto px-8 py-7 bg-background">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Weekly deliverables
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Drag to reorder. Each card = one week. Min 1, max 10.
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
                  placeholder="e.g. Make Week 1 lighter. Focus more on user research. Drop the billing deliverable."
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
                    onClick={handleRegenerate}
                    disabled={!regenInstructions.trim() || regenerating}
                    className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    <RefreshCw
                      size={12}
                      className={regenerating ? "animate-spin" : ""}
                    />
                    {regenerating ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
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
                  {/* Dot marker */}
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

function TimelineCard({
  deliverable,
  index,
  canDelete,
  onUpdate,
  onRemove,
}: {
  deliverable: Deliverable;
  index: number;
  canDelete: boolean;
  onUpdate: (id: string, field: "title" | "description", value: string) => void;
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
      {/* Timeline dot */}
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
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 mt-1 text-on-surface-variant/40 hover:text-on-surface-variant cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                Week {index + 1}
              </span>
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
