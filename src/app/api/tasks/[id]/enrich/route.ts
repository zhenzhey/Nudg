import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTaskMetadata } from "@/lib/ai";

// Lazily generate start_step + ai_assist for a task that was created before
// these fields were filled in. Merges into existing metadata rather than
// overwriting, so any future fields stay intact.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, description, metadata, deliverables(title, goals(title, user_id))")
      .eq("id", id)
      .single();

    if (fetchError || !task) {
      console.error("[api/tasks/[id]/enrich] fetch failed", { id, fetchError });
      return NextResponse.json(
        { error: "Task not found", detail: fetchError?.message },
        { status: 404 }
      );
    }

    const deliverableRaw = task.deliverables as unknown as
      | { title: string; goals: { title: string; user_id: string } | { title: string; user_id: string }[] | null }
      | { title: string; goals: { title: string; user_id: string } | { title: string; user_id: string }[] | null }[]
      | null;
    const deliverable = Array.isArray(deliverableRaw) ? deliverableRaw[0] : deliverableRaw;
    const projectRaw = deliverable?.goals;
    const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
    if (!deliverable || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = (task.metadata ?? {}) as Record<string, unknown>;
    if (typeof existing.start_step === "string" && typeof existing.ai_assist === "string") {
      return NextResponse.json({ task });
    }

    const generated = await generateTaskMetadata({
      taskTitle: task.title,
      taskDescription: task.description,
      deliverableTitle: deliverable.title ?? "",
      projectTitle: project.title ?? "",
    });

    const merged = { ...existing, ...generated };

    const { data: updated, error: updateError } = await supabase
      .from("tasks")
      .update({ metadata: merged })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("[api/tasks/[id]/enrich POST]", err);
    return NextResponse.json({ error: "Failed to enrich task" }, { status: 500 });
  }
}
