import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// GET /api/goals/[id] — get a single goal with all deliverables and tasks
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("goals")
      .select(`
        *,
        deliverables (
          *,
          tasks (*)
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Sort deliverables and tasks by their sequence numbers
    data.deliverables?.sort((a: { week_number: number }, b: { week_number: number }) => a.week_number - b.week_number);
    data.deliverables?.forEach((d: { tasks?: { created_at: string }[] }) => {
      d.tasks?.sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return NextResponse.json({ goal: data });
  } catch (err) {
    console.error("[api/goals/[id] GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

const UpdateGoalSchema = z.object({
  status: z.enum(["active", "completed", "abandoned"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
});

// PATCH /api/goals/[id] — update goal status or details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = UpdateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("goals")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ goal: data });
  } catch (err) {
    console.error("[api/goals/[id] PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

// DELETE /api/goals/[id] — delete a goal and all its data
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/goals/[id] DELETE] Error:", err);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
