import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  estimated_hours: z.number().min(0.5).max(2).optional(),
});

const DeliverableSchema = z.object({
  week_number: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  outcome_description: z.string().optional(),
  verification_type: z
    .enum(["manual_upload", "github_commit", "google_doc", "screenshot", "referee_approval"])
    .default("manual_upload"),
  tasks: z.array(TaskSchema),
});

const CreateProjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  duration_weeks: z.number().int().min(1).max(12),
  ai_plan: z.any().optional(),
  deliverables: z.array(DeliverableSchema).min(1).max(10),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("goals")
      .select(`*, deliverables(*, tasks(*))`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects: data });
  } catch (err) {
    console.error("[api/projects GET]", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { deliverables: deliverableData, ...questData } = parsed.data;

    const { data: quest, error: questError } = await supabase
      .from("goals")
      .insert({ ...questData, user_id: user.id })
      .select()
      .single();

    if (questError) throw questError;

    const startDate = new Date();
    const deliverablesToInsert = deliverableData.map((d) => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + d.week_number * 7);
      return {
        goal_id: quest.id,
        week_number: d.week_number,
        title: d.title,
        description: d.description,
        outcome_description: d.outcome_description,
        verification_type: d.verification_type,
        due_date: dueDate.toISOString().split("T")[0],
      };
    });

    const { data: deliverables, error: delivError } = await supabase
      .from("deliverables")
      .insert(deliverablesToInsert)
      .select();

    if (delivError) throw delivError;

    const tasksToInsert = deliverableData.flatMap((d, idx) => {
      const deliverable = deliverables[idx];
      return d.tasks.map((t) => ({
        deliverable_id: deliverable.id,
        title: t.title,
        description: t.description,
        estimated_hours: t.estimated_hours,
      }));
    });

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert);
      if (tasksError) throw tasksError;
    }

    return NextResponse.json({ project: quest }, { status: 201 });
  } catch (err) {
    console.error("[api/projects POST]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
