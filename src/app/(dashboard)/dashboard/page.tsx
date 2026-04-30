import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Project } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

// Local date in YYYY-MM-DD. Using toISOString here would return UTC, which
// shifts the day forward for users west of UTC during the evening — that's
// how the dashboard ended up labelled "Apr 30" at 8pm Pacific on Apr 29.
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("goals")
    .select(`*, deliverables(*, tasks(*))`)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <DashboardContent
      projects={(projects ?? []) as Project[]}
      today={isoDate(now)}
      tomorrow={isoDate(tomorrow)}
    />
  );
}
