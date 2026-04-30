import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, getGoalProgress, calculateStreak } from "@/lib/utils";
import type { Quest, Deliverable } from "@/types";
import { CheckCircle2, Flame, Zap, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
};

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: "success" | "warning" | "primary" | "error" | "muted";
}) {
  const valueColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : tone === "primary"
      ? "text-primary"
      : tone === "error"
      ? "text-error"
      : "text-on-surface";
  const iconBg =
    tone === "success"
      ? "bg-success-muted"
      : tone === "warning"
      ? "bg-warning-muted"
      : tone === "primary"
      ? "bg-primary/10"
      : tone === "error"
      ? "bg-error-container/40"
      : "bg-surface-container";
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2.5 bg-surface-container-lowest rounded-xl px-3 py-2.5 ring-1 ring-outline-variant/10">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
        {icon}
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span className={cn("text-lg font-black tabular-nums leading-none", valueColor)}>{value}</span>
        <span className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">{label}</span>
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quests } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allQuests = (quests ?? []) as Quest[];
  const allDeliverables = allQuests.flatMap((q) => q.deliverables ?? []);
  const submitted = allDeliverables.filter(
    (d) => d.status === "submitted" || d.status === "verified"
  );
  const missed = allDeliverables.filter((d) => d.status === "missed");
  const streak = calculateStreak(allDeliverables);
  const completedQuests = allQuests.filter((q) => q.status === "completed");

  const submittedSorted = [...submitted].sort((a, b) => {
    if (!a.submitted_at || !b.submitted_at) return 0;
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  const deliverableQuestMap = new Map<string, Quest>();
  allQuests.forEach((q) => {
    (q.deliverables ?? []).forEach((d) => deliverableQuestMap.set(d.id, q));
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-black tracking-tight text-on-surface">Projects</h1>
        <Link href="/projects/new">
          <button className="flex items-center gap-1.5 bg-neutral text-on-neutral text-sm font-semibold px-4 py-2 rounded-xl hover:bg-neutral/90 transition-colors shadow-sm cursor-pointer">
            <Plus size={14} />
            New
          </button>
        </Link>
      </div>
      <p className="text-on-surface-variant text-sm mb-6">
        Every deliverable you ship is proof of work.
      </p>

      {/* Stats strip — single row */}
      <div className="flex items-stretch gap-2 mb-8">
        <StatCard icon={<CheckCircle2 size={15} className="text-success" />} value={submitted.length} label="shipped" tone="success" />
        <StatCard icon={<Flame size={15} className={streak > 0 ? "text-warning" : "text-on-surface-variant"} />} value={streak} label="streak" tone={streak > 0 ? "warning" : "muted"} />
        <StatCard icon={<Zap size={15} className="text-primary" />} value={completedQuests.length} label="done" tone="primary" />
        {missed.length > 0 && (
          <StatCard icon={<span className="block w-2 h-2 rounded-full bg-error" />} value={missed.length} label="missed" tone="error" />
        )}
      </div>

      {/* Project cards */}
      {allQuests.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            All Projects
          </h2>
          <div className="space-y-3">
            {allQuests.map((quest) => {
              const progress = getGoalProgress(quest);
              const deliverables = (quest.deliverables ?? []).slice().sort(
                (a: Deliverable, b: Deliverable) =>
                  (a.order_index ?? a.week_number ?? 0) - (b.order_index ?? b.week_number ?? 0)
              );
              const questSubmitted = deliverables.filter(
                (d: Deliverable) => d.status === "submitted" || d.status === "verified"
              ).length;
              const questMissed = deliverables.filter(
                (d: Deliverable) => d.status === "missed"
              ).length;
              const total = deliverables.length || quest.duration_weeks;
              const accentColor =
                quest.status === "completed"
                  ? "before:bg-success"
                  : quest.status === "active"
                  ? "before:bg-gradient-to-b before:from-primary before:to-accent"
                  : "before:bg-on-surface-variant/30";

              return (
                <Link key={quest.id} href={`/projects/${quest.id}`} className="block">
                  <div
                    className={cn(
                      "group relative bg-surface-container-lowest rounded-2xl p-5 ring-1 ring-outline-variant/10 hover:ring-primary/30 hover:shadow-card transition-all",
                      "before:absolute before:left-0 before:top-5 before:bottom-5 before:w-1 before:rounded-r-full",
                      accentColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {quest.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Started {formatDate(quest.start_date)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0",
                          quest.status === "active"
                            ? "bg-primary/10 text-primary"
                            : quest.status === "completed"
                            ? "bg-success-muted text-success"
                            : "bg-surface-container text-on-surface-variant"
                        )}
                      >
                        {quest.status}
                      </span>
                    </div>

                    {/* Progress segments — fill left-to-right */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {Array.from({ length: total }).map((_, idx) => {
                        const isFilled = idx < questSubmitted;
                        const isMissed = !isFilled && idx < questSubmitted + questMissed;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "h-2 flex-1 rounded-full transition-colors",
                              isFilled
                                ? "bg-gradient-to-r from-primary to-accent"
                                : isMissed
                                ? "bg-error/40"
                                : "bg-surface-container ring-1 ring-outline-variant/15"
                            )}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-on-surface-variant">
                        <span className="font-mono font-semibold text-on-surface">
                          {questSubmitted}<span className="text-on-surface-variant/60">/{total}</span>
                        </span>
                        <span>·</span>
                        <span>{progress}% complete</span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary font-semibold">
                        Open <ExternalLink size={11} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-outline-variant/30 rounded-2xl mb-8">
          <p className="text-on-surface-variant text-sm mb-4">No projects yet. Start building something.</p>
          <Link href="/projects/new">
            <button className="text-sm text-primary hover:text-primary-dim transition-colors font-medium">
              Start your first project →
            </button>
          </Link>
        </div>
      )}

      {/* Shipped feed */}
      {submittedSorted.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            Shipped deliverables
          </h2>
          <div className="space-y-2">
            {submittedSorted.map((d) => {
              const parentQuest = deliverableQuestMap.get(d.id);
              return (
                <div key={d.id} className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-muted rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface">{d.title}</p>
                      {parentQuest && (
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {parentQuest.title} · Week {d.week_number}
                        </p>
                      )}
                      {d.submission_url && (
                        <a
                          href={d.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dim mt-1.5 transition-colors"
                        >
                          <ExternalLink size={11} />
                          View submission
                        </a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={d.status} />
                      {d.submitted_at && (
                        <p className="text-xs text-on-surface-variant mt-1.5">
                          {formatDate(d.submitted_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
