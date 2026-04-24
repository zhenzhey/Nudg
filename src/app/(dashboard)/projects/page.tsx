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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black tracking-tight text-on-surface">Projects</h1>
        <Link href="/projects/new">
          <button className="flex items-center gap-1.5 bg-neutral text-on-neutral text-sm font-semibold px-4 py-2 rounded-xl hover:bg-neutral/90 transition-colors shadow-sm">
            <Plus size={14} />
            New Project
          </button>
        </Link>
      </div>
      <p className="text-on-surface-variant mb-8">
        Every deliverable you ship is proof of work. This is your track record.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/10 text-center shadow-kinetic-sm">
          <div className="text-2xl font-black text-success">{submitted.length}</div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={11} />
            Shipped
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/10 text-center shadow-kinetic-sm">
          <div className={cn("text-2xl font-black", streak > 0 ? "text-warning" : "text-on-surface")}>
            {streak}
          </div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center justify-center gap-1">
            <Flame size={11} />
            Week streak
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/10 text-center shadow-kinetic-sm">
          <div className="text-2xl font-black text-primary">{completedQuests.length}</div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center justify-center gap-1">
            <Zap size={11} />
            Projects done
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline-variant/10 text-center shadow-kinetic-sm">
          <div className={cn("text-2xl font-black", missed.length > 0 ? "text-error" : "text-on-surface")}>
            {missed.length}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Missed</div>
        </div>
      </div>

      {/* Quest progress */}
      {allQuests.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            All Projects
          </h2>
          <div className="space-y-3">
            {allQuests.map((quest) => {
              const progress = getGoalProgress(quest);
              const questSubmitted = (quest.deliverables ?? []).filter(
                (d: Deliverable) => d.status === "submitted" || d.status === "verified"
              ).length;

              return (
                <Link key={quest.id} href={`/projects/${quest.id}`}>
                  <div className="bg-surface-container-lowest rounded-xl p-5 ring-1 ring-outline-variant/10 hover:ring-outline-variant/30 hover:shadow-kinetic transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-on-surface">{quest.title}</h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Started {formatDate(quest.start_date)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full font-semibold",
                          quest.status === "active"
                            ? "bg-primary-container/40 text-primary"
                            : quest.status === "completed"
                            ? "bg-success-muted text-success"
                            : "bg-surface-container text-on-surface-variant"
                        )}
                      >
                        {quest.status}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                        <span>{questSubmitted}/{quest.duration_weeks} weeks shipped</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={cn(
                            "progress-fill",
                            progress === 100 ? "bg-success" : "bg-gradient-to-r from-primary to-accent"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-3">
                      {(quest.deliverables ?? []).map((d: Deliverable) => (
                        <div
                          key={d.id}
                          title={`Week ${d.week_number}: ${d.title}`}
                          className={cn(
                            "w-5 h-5 rounded-md",
                            d.status === "submitted" || d.status === "verified"
                              ? "bg-success"
                              : d.status === "missed"
                              ? "bg-error/40"
                              : "bg-surface-container ring-1 ring-outline-variant/20"
                          )}
                        />
                      ))}
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
