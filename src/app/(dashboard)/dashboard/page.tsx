import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoalCard } from "@/components/goals/goal-card";
import { Button } from "@/components/ui/button";
import { getCurrentWeek, calculateStreak } from "@/lib/utils";
import type { Goal, Deliverable } from "@/types";
import { Plus, Target, Flame, CheckCircle2, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all goals with deliverables and tasks
  const { data: goals } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activeGoals = (goals ?? []).filter((g: Goal) => g.status === "active");
  const completedGoals = (goals ?? []).filter((g: Goal) => g.status === "completed");

  // Compute global stats
  const totalSubmitted = (goals ?? []).flatMap((g: Goal) => g.deliverables ?? [])
    .filter((d: Deliverable) => d.status === "submitted" || d.status === "verified").length;

  const allDeliverables = (goals ?? []).flatMap((g: Goal) => g.deliverables ?? []);
  const globalStreak = calculateStreak(allDeliverables);

  // Get this week's pending deliverables across all active goals
  const thisWeekDeliverables = activeGoals.flatMap((g: Goal) => {
    const week = getCurrentWeek(g.start_date);
    return (g.deliverables ?? []).filter(
      (d: Deliverable) => d.week_number === week && d.status === "pending"
    ).map((d: Deliverable) => ({ ...d, goal: g }));
  });

  // Fetch profile for name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Builder";

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Hey {firstName} 👋
          </h1>
          <p className="text-text-muted mt-1">
            {activeGoals.length === 0
              ? "Set your first goal and start shipping."
              : `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""}. Keep shipping.`}
          </p>
        </div>
        <Link href="/goals/new">
          <Button variant="primary" size="md">
            <Plus size={15} />
            New goal
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      {(goals ?? []).length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-text-primary">{totalSubmitted}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-1">
              <CheckCircle2 size={12} />
              Deliverables shipped
            </div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-text-primary">{activeGoals.length}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-1">
              <Target size={12} />
              Active goals
            </div>
          </div>
          <div className="card text-center">
            <div className={`text-2xl font-bold ${globalStreak > 0 ? "text-warning" : "text-text-primary"}`}>
              {globalStreak}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-1">
              <Flame size={12} />
              Week streak
            </div>
          </div>
        </div>
      )}

      {/* This week's pending deliverables */}
      {thisWeekDeliverables.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Due this week
          </h2>
          <div className="space-y-3">
            {thisWeekDeliverables.map((d: Deliverable & { goal: Goal }) => (
              <Link key={d.id} href={`/goals/${d.goal.id}`}>
                <div className="flex items-center gap-4 p-4 bg-warning-muted border border-warning/30 rounded-xl hover:border-warning/60 transition-colors cursor-pointer">
                  <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{d.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{d.goal.title}</p>
                  </div>
                  <span className="text-xs text-warning font-medium shrink-0">Submit →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Active goals
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal: Goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      ) : (
        // Empty state
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No active goals</h3>
          <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
            Set a goal, let AI build your weekly plan, and start shipping.
          </p>
          <Link href="/goals/new">
            <Button variant="primary" size="md">
              <Plus size={15} />
              Create your first goal
            </Button>
          </Link>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal: Goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
