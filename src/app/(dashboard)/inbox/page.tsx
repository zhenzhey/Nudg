import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Inbox } from "lucide-react";
import { InboxList } from "@/components/inbox/inbox-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("inbox")
    .select("*, goals(title), deliverables(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center border border-outline/20">
          <Inbox size={18} className="text-on-surface-variant" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-on-surface">Inbox</h1>
      </div>
      <p className="text-on-surface-variant mb-8 text-sm">
        Your quick captures — notes and images associated with your projects.
      </p>

      <InboxList initialItems={items ?? []} />
    </div>
  );
}
