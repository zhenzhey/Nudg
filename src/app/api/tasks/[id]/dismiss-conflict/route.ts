import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/tasks/[id]/dismiss-conflict
// User chose "Keep" on a Google Calendar conflict warning — silence it until
// the task is next rescheduled (which clears the timestamp via the schedule routes).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("tasks")
      .update({ conflict_dismissed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/tasks/[id]/dismiss-conflict]", err);
    return NextResponse.json({ error: "Failed to dismiss" }, { status: 500 });
  }
}
