import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateTaskSchema = z.object({
  deliverable_id: z.string().uuid().optional(),
  title: z.string().min(1).max(5000),
  description: z.string().max(10000).optional(),
  scheduled_date: z.string().nullable().optional(),
  scheduled_time: z.number().nullable().optional(),
  estimated_hours: z.number().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { deliverable_id, title, description, scheduled_date, scheduled_time, estimated_hours } = parsed.data;

    // If deliverable_id provided, verify it belongs to the user
    if (deliverable_id) {
      const { data: deliverable } = await supabase
        .from("deliverables")
        .select("id, goals(user_id)")
        .eq("id", deliverable_id)
        .single();
      const goals = deliverable?.goals as unknown as { user_id: string } | null;
      const goalUserId = goals?.user_id;
      if (!deliverable || goalUserId !== user.id) {
        return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
      }
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        deliverable_id: deliverable_id ?? null,
        title,
        description: description ?? null,
        status: "pending",
        estimated_hours: estimated_hours ?? null,
        scheduled_date: scheduled_date ?? null,
        scheduled_time: scheduled_time ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[api/tasks POST]", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
