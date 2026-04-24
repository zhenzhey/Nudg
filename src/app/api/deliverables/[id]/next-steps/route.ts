import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestNextSteps } from "@/lib/ai";
import { z } from "zod";

const RequestSchema = z.object({
  count: z.union([z.literal(1), z.literal(3)]),
});

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
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { count } = parsed.data;

    const { data: deliverable, error: delivError } = await supabase
      .from("deliverables")
      .select("*, tasks(*), goals(title, description)")
      .eq("id", id)
      .single();

    if (delivError || !deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const { data: inboxItems } = await supabase
      .from("inbox")
      .select("content")
      .eq("deliverable_id", id)
      .order("created_at", { ascending: false })
      .limit(5);

    const existingTasks = (deliverable.tasks ?? []) as Array<{ title: string; status: string }>;
    const project = deliverable.goals as { title: string; description: string | null } | null;

    const suggestions = await suggestNextSteps(
      {
        deliverableTitle: deliverable.title,
        deliverableDescription: deliverable.description,
        projectTitle: project?.title ?? "Project",
        projectDescription: project?.description ?? null,
        existingPendingTasks: existingTasks.filter((t) => t.status !== "completed").map((t) => t.title),
        completedTasks: existingTasks.filter((t) => t.status === "completed").map((t) => t.title),
        recentInbox: (inboxItems ?? []).map((i: { content: string }) => i.content),
      },
      count
    );

    const { data: createdTasks, error: insertError } = await supabase
      .from("tasks")
      .insert(
        suggestions.map((s) => ({
          deliverable_id: id,
          title: s.title,
          estimated_hours: s.estimated_hours,
          status: "pending",
        }))
      )
      .select();

    if (insertError) throw insertError;
    return NextResponse.json({ tasks: createdTasks });
  } catch (err) {
    console.error("[api/deliverables/[id]/next-steps POST]", err);
    return NextResponse.json({ error: "Failed to suggest next steps" }, { status: 500 });
  }
}
