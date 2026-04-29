import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { upsertTaskEvent, removeTaskEvent } from "@/lib/google/sync";

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  estimated_hours: z.number().positive().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

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
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // If title/description/duration/date changed and the task is scheduled,
    // mirror the change to its Google event.
    if (task.scheduled_date && task.scheduled_time != null) {
      await upsertTaskEvent(user.id, {
        id: task.id,
        title: task.title,
        description: task.description,
        scheduled_date: task.scheduled_date,
        scheduled_time: task.scheduled_time,
        estimated_hours: task.estimated_hours,
        google_event_id: task.google_event_id ?? null,
      });
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error("[api/tasks/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Read google_event_id before delete so we can remove the calendar event.
    const { data: existing } = await supabase
      .from("tasks")
      .select("google_event_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;

    await removeTaskEvent(user.id, existing?.google_event_id ?? null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/tasks/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
