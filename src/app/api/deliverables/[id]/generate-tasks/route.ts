import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDeliverableTasks } from "@/lib/ai";
import { computeTaskDueDates } from "@/lib/utils";
import type { InterviewAnswer } from "@/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: deliverable, error: delivError } = await supabase
      .from("deliverables")
      .select("*, tasks(id), goals(id, user_id, title, description, start_date, clarification_data, deliverables(order_index, title))")
      .eq("id", id)
      .single();

    if (delivError || !deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const project = deliverable.goals as {
      id: string;
      user_id: string;
      title: string;
      description: string | null;
      start_date: string;
      clarification_data: InterviewAnswer[] | null;
      deliverables: Array<{ order_index: number; title: string }>;
    } | null;

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if ((deliverable.tasks ?? []).length > 0) {
      return NextResponse.json({ error: "Tasks already exist" }, { status: 409 });
    }

    const tasks = await generateDeliverableTasks({
      projectTitle: project.title,
      projectDescription: project.description ?? "",
      orderIndex: deliverable.order_index,
      deliverableTitle: deliverable.title,
      deliverableDescription: deliverable.description ?? "",
      outcomeDescription: deliverable.outcome_description ?? undefined,
      estimatedHours: Number(deliverable.estimated_hours ?? 4),
      allDeliverables: project.deliverables ?? [],
      interview: project.clarification_data ?? undefined,
    });

    if (tasks.length === 0) {
      return NextResponse.json({ error: "No tasks generated" }, { status: 502 });
    }

    // Slice the deliverable's window into per-task due_dates by cumulative
    // estimated_hours. Window starts at max(today, project.start_date) so
    // tasks aren't due in the past.
    const todayStr = new Date().toISOString().slice(0, 10);
    const windowStart =
      project.start_date && project.start_date > todayStr ? project.start_date : todayStr;
    const deliverableDue = deliverable.due_date ?? windowStart;

    const dueDates =
      deliverableDue >= windowStart
        ? computeTaskDueDates(tasks, windowStart, deliverableDue)
        : tasks.map(() => null as string | null);

    const { data: createdTasks, error: insertError } = await supabase
      .from("tasks")
      .insert(
        tasks.map((t, i) => {
          const meta: Record<string, string> = {};
          if (t.start_step) meta.start_step = t.start_step;
          if (t.ai_assist) meta.ai_assist = t.ai_assist;
          return {
            deliverable_id: id,
            title: t.title,
            description: t.description,
            estimated_hours: t.estimated_hours,
            status: "pending",
            due_date: dueDates[i] ?? null,
            metadata: Object.keys(meta).length > 0 ? meta : null,
          };
        })
      )
      .select();

    if (insertError) throw insertError;
    return NextResponse.json({ tasks: createdTasks });
  } catch (err) {
    console.error("[api/deliverables/[id]/generate-tasks POST]", err);
    return NextResponse.json({ error: "Failed to generate tasks" }, { status: 500 });
  }
}
