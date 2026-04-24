import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const TEST_EMAIL = process.env.TEST_USER_EMAIL || "demo@nudg.app";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "demo-nudg-2026";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function ensureTestUser(): Promise<string> {
  const a = admin();

  // Look up by email (paginate defensively in case of many users)
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await a.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }

  const { data, error } = await a.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Builder" },
  });
  if (error) throw error;
  return data.user.id;
}

async function seedIfEmpty(userId: string) {
  const a = admin();

  const { count } = await a
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14); // project started 2 weeks ago

  const { data: goal, error: goalErr } = await a
    .from("goals")
    .insert({
      user_id: userId,
      title: "Ship an AI-powered portfolio site",
      description:
        "A deployed Next.js site with a working AI chat demo, case studies, and analytics — something recruiters can actually click through.",
      duration_weeks: 6,
      status: "active",
      start_date: startDate.toISOString().split("T")[0],
    })
    .select()
    .single();
  if (goalErr) throw goalErr;

  const isoPlus = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const deliverables = [
    {
      goal_id: goal.id,
      week_number: 1,
      title: "Repo + design system scaffolded",
      description: "Next.js app deployed to Vercel with base layout, typography, and color tokens.",
      outcome_description: "Live URL showing homepage shell with nav + hero.",
      verification_type: "manual_upload",
      due_date: isoPlus(7),
      status: "verified",
      submission_url: "https://example.com/week-1",
      submitted_at: isoPlus(6) + "T18:00:00Z",
    },
    {
      goal_id: goal.id,
      week_number: 2,
      title: "Case study pages built",
      description: "Three case-study detail pages with MDX content and project screenshots.",
      outcome_description: "Three URLs, each with a full write-up and images.",
      verification_type: "manual_upload",
      due_date: isoPlus(14),
      status: "submitted",
      submission_url: "https://example.com/week-2",
      submitted_at: isoPlus(13) + "T21:00:00Z",
    },
    {
      goal_id: goal.id,
      week_number: 3,
      title: "AI chat demo wired to API",
      description: "Interactive chat widget on homepage using Claude API with streaming responses.",
      outcome_description: "Working chat on live URL that responds in under 2s.",
      verification_type: "manual_upload",
      due_date: isoPlus(21),
      status: "pending",
    },
    {
      goal_id: goal.id,
      week_number: 4,
      title: "Analytics + SEO polish",
      description: "Plausible analytics, OG images, sitemap, and Lighthouse score >95.",
      outcome_description: "Screenshot of Lighthouse report + live analytics dashboard.",
      verification_type: "screenshot",
      due_date: isoPlus(28),
      status: "pending",
    },
  ];

  const { data: insertedDeliverables, error: dErr } = await a
    .from("deliverables")
    .insert(deliverables)
    .select();
  if (dErr) throw dErr;

  const deliv = (week: number) => insertedDeliverables.find((d) => d.week_number === week)!;

  // Probe which optional columns exist (migrations may be partially applied)
  async function hasColumn(table: string, col: string): Promise<boolean> {
    const { error } = await a.from(table).select(col).limit(1);
    return !error;
  }
  const hasUserId = await hasColumn("tasks", "user_id");
  const hasScheduledDate = await hasColumn("tasks", "scheduled_date");
  const hasScheduledTime = await hasColumn("tasks", "scheduled_time");

  const today = new Date().toISOString().split("T")[0];

  const linkedTasks = [
    // Week 1 — done
    { deliverable_id: deliv(1).id, title: "Init Next.js app + Tailwind", estimated_hours: 1, status: "completed", completed_at: isoPlus(1) + "T12:00:00Z" },
    { deliverable_id: deliv(1).id, title: "Set up design tokens", estimated_hours: 1.5, status: "completed", completed_at: isoPlus(2) + "T14:00:00Z" },
    { deliverable_id: deliv(1).id, title: "Deploy to Vercel + custom domain", estimated_hours: 1, status: "completed", completed_at: isoPlus(5) + "T10:00:00Z" },

    // Week 2 — done
    { deliverable_id: deliv(2).id, title: "Write case study #1", estimated_hours: 2, status: "completed", completed_at: isoPlus(8) + "T16:00:00Z" },
    { deliverable_id: deliv(2).id, title: "Write case study #2", estimated_hours: 2, status: "completed", completed_at: isoPlus(10) + "T16:00:00Z" },
    { deliverable_id: deliv(2).id, title: "Write case study #3", estimated_hours: 2, status: "completed", completed_at: isoPlus(12) + "T16:00:00Z" },

    // Week 3 — current. One scheduled (in-progress), the rest left for "Plan my week" to arrange.
    withSched({ deliverable_id: deliv(3).id, title: "Set up Claude API route", estimated_hours: 1.5, status: "in_progress" }, today, 10),
    { deliverable_id: deliv(3).id, title: "Build chat UI component", estimated_hours: 2, status: "pending" },
    { deliverable_id: deliv(3).id, title: "Stream responses + handle errors", estimated_hours: 2, status: "pending" },
    { deliverable_id: deliv(3).id, title: "Polish + deploy", estimated_hours: 1, status: "pending" },

    // Week 4 — upcoming
    { deliverable_id: deliv(4).id, title: "Integrate Plausible", estimated_hours: 1, status: "pending" },
    { deliverable_id: deliv(4).id, title: "OG images + favicons", estimated_hours: 1.5, status: "pending" },
    { deliverable_id: deliv(4).id, title: "Lighthouse audit + fixes", estimated_hours: 2, status: "pending" },
  ];

  function withSched(row: Record<string, unknown>, date: string, time: number | undefined) {
    if (hasScheduledDate) row.scheduled_date = date;
    if (hasScheduledTime && time !== undefined) row.scheduled_time = time;
    return row;
  }

  const { error: tErr } = await a.from("tasks").insert(linkedTasks);
  if (tErr) throw tErr;

  // Standalone calendar tasks — requires migration 008 (user_id column + nullable deliverable_id)
  if (hasUserId) {
    const standalone = [
      withSched({ user_id: userId, deliverable_id: null, title: "Reply to recruiter DMs", estimated_hours: 0.5, status: "pending" }, today, 9),
      withSched({ user_id: userId, deliverable_id: null, title: "Review last week's analytics", estimated_hours: 1, status: "pending" }, today, 17),
    ];
    const { error } = await a.from("tasks").insert(standalone);
    if (error) console.warn("[api/test-login] skipping standalone tasks:", error.message);
  }

  // Inbox — requires migration 004
  const { error: inboxErr } = await a.from("inbox").insert([
    { user_id: userId, content: "Idea: add a dark mode toggle to the site" },
    { user_id: userId, content: "Bug: hero animation stutters on Safari mobile" },
    { user_id: userId, content: "Follow up with Alex about the referral" },
  ]);
  if (inboxErr) console.warn("[api/test-login] skipping inbox seed:", inboxErr.message);
}

async function wipeUserData(userId: string) {
  const a = admin();
  // tasks and deliverables cascade from goals, but standalone tasks don't — nuke them explicitly
  await a.from("tasks").delete().eq("user_id", userId);
  await a.from("goals").delete().eq("user_id", userId);
  await a.from("inbox").delete().eq("user_id", userId);
}

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const reset = url.searchParams.get("reset") === "1";

    const userId = await ensureTestUser();
    if (reset) await wipeUserData(userId);
    await seedIfEmpty(userId);

    const supabase = await createServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (signInError) throw signInError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/test-login]", err);
    const message = err instanceof Error ? err.message : "Test login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
