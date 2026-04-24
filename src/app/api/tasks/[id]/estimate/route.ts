import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAndEstimateTask } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rawInput: string | undefined = body?.raw_input;

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*, deliverables(title, goals(title))")
      .eq("id", id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const deliverable = task.deliverables as { title: string; goals: { title: string } | null } | null;
    const projectTitle = deliverable?.goals?.title ?? "Project";
    const deliverableTitle = deliverable?.title ?? "Deliverable";

    const processed = await processAndEstimateTask(
      rawInput ?? task.title,
      deliverableTitle,
      projectTitle
    );

    const { data: updated, error: updateError } = await supabase
      .from("tasks")
      .update({
        title: processed.title,
        description: processed.description,
        estimated_hours: processed.estimated_hours,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("[api/tasks/[id]/estimate POST]", err);
    return NextResponse.json({ error: "Failed to process task" }, { status: 500 });
  }
}
