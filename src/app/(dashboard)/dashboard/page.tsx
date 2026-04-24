import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Project } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
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
