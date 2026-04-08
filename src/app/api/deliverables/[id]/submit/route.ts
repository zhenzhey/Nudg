import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SubmitSchema = z.object({
  submission_url: z.string().url().optional().or(z.literal("")),
  submission_notes: z.string().max(2000).optional(),
});

// POST /api/deliverables/[id]/submit — submit a deliverable
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }

    const { submission_url, submission_notes } = parsed.data;

    // Verify the deliverable belongs to the user via goal ownership
    const { data: deliverable, error: fetchError } = await supabase
      .from("deliverables")
      .select(`id, goal_id, goals!inner(user_id)`)
      .eq("id", id)
      .single();

    if (fetchError || !deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Update the deliverable to submitted
    const { data, error } = await supabase
      .from("deliverables")
      .update({
        status: "submitted",
        submission_url: submission_url || null,
        submission_notes: submission_notes || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ deliverable: data });
  } catch (err) {
    console.error("[api/deliverables/[id]/submit] Error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
