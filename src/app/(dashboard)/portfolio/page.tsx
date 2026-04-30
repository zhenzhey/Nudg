import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioView, type PortfolioCaseStudy } from "@/components/portfolio/portfolio-view";
import type { Project, Deliverable, Task } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio" };

const HEATMAP_DAYS = 60;

// Bucket by UTC calendar day. completed_at is stored via toISOString() so its
// YYYY-MM-DD prefix is the UTC date — matching it directly avoids the local
// timezone shift that would otherwise scatter same-day completions across two
// adjacent cells.
function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

function utcDayOffset(base: Date, days: number): Date {
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + days,
      0,
      0,
      0,
    ),
  );
}

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allProjects = (projects ?? []) as Project[];
  const shipped = allProjects.filter((p) => p.status === "completed");

  const allTasks: Task[] = allProjects.flatMap(
    (p) => (p.deliverables ?? []).flatMap((d: Deliverable) => d.tasks ?? [])
  );
  const completedTasks = allTasks.filter((t) => t.status === "completed");

  // Streak: consecutive UTC days back from today with at least one completed task
  const completedByDay = new Map<string, number>();
  for (const t of completedTasks) {
    if (!t.completed_at) continue;
    const k = utcDayKeyFromIso(t.completed_at);
    completedByDay.set(k, (completedByDay.get(k) ?? 0) + 1);
  }
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = utcDayKey(utcDayOffset(today, -i));
    if (completedByDay.has(key)) streak++;
    else if (i > 0) break;
    else continue; // allow today empty without breaking the streak
  }

  // Focus hours: sum estimated_hours of completed tasks
  const focusHours = Math.round(
    completedTasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0)
  );

  // Heatmap: counts per UTC day for last HEATMAP_DAYS days
  const heatmap: number[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const key = utcDayKey(utcDayOffset(today, -i));
    heatmap.push(completedByDay.get(key) ?? 0);
  }
  const startDate = utcDayOffset(today, -(HEATMAP_DAYS - 1));
  const endKey = utcDayKey(today);
  const startKey = utcDayKey(startDate);

  const caseStudies: PortfolioCaseStudy[] = shipped.map((p) => {
    const tasks = (p.deliverables ?? []).flatMap((d: Deliverable) => d.tasks ?? []);
    const projectFocus = Math.round(
      tasks
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0)
    );
    // Cycle: prefer actual span from start_date → last completion; else duration_weeks
    const completions = tasks
      .filter((t) => t.status === "completed" && t.completed_at)
      .map((t) => new Date(t.completed_at as string).getTime());
    let cycleDays: number | null = null;
    if (p.start_date && completions.length) {
      const start = new Date(p.start_date).getTime();
      const end = Math.max(...completions);
      cycleDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    } else if (p.duration_weeks) {
      cycleDays = p.duration_weeks * 7;
    }
    const shippedAt = completions.length
      ? new Date(Math.max(...completions))
      : new Date(p.updated_at);
    return {
      id: p.id,
      name: p.title,
      shippedAt: shippedAt.toISOString(),
      cycleDays,
      focusHours: projectFocus,
      taskCount: tasks.filter((t) => t.status === "completed").length,
    };
  });

  const username = (user.email ?? "").split("@")[0] || "you";

  return (
    <PortfolioView
      username={username}
      shippedCount={shipped.length}
      streak={streak}
      focusHours={focusHours}
      taskCount={completedTasks.length}
      heatmap={heatmap}
      heatmapStart={startKey}
      heatmapEnd={endKey}
      caseStudies={caseStudies}
    />
  );
}
