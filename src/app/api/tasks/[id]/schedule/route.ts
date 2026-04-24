import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScheduleSchema = z.object({
  scheduled_date: z.string().nullable(),
  scheduled_time: z.number().nullable().optional(),
});

// PATCH /api/tasks/[id]/schedule — set or clear a task's scheduled date
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
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const update: Record<string, unknown> = { scheduled_date: parsed.data.scheduled_date };
    if (parsed.data.scheduled_time !== undefined) update.scheduled_time = parsed.data.scheduled_time;

    const { data, error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("[api/tasks/[id]/schedule] Error:", err);
    return NextResponse.json({ error: "Failed to schedule task" }, { status: 500 });
  }
}
