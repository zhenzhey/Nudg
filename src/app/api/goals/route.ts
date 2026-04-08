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
  tasks: z.array(TaskSchema),
});

const CreateGoalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  duration_weeks: z.number().int().min(1).max(12),
  ai_plan: z.any().optional(),
  deliverables: z.array(DeliverableSchema),
});

// GET /api/goals — list all goals for the current user
export async function GET() {
  try {
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ goals: data });
  } catch (err) {
    console.error("[api/goals GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

// POST /api/goals — create a new goal with its deliverables and tasks
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { deliverables: deliverableData, ...goalData } = parsed.data;

    // Create the goal
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .insert({ ...goalData, user_id: user.id })
      .select()
      .single();

    if (goalError) throw goalError;

    // Calculate due dates and insert deliverables
    const startDate = new Date();
    const deliverablesToInsert = deliverableData.map((d) => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + d.week_number * 7);
      return {
        goal_id: goal.id,
        week_number: d.week_number,
        title: d.title,
        description: d.description,
        outcome_description: d.outcome_description,
        due_date: dueDate.toISOString().split("T")[0],
      };
    });

    const { data: deliverables, error: delivError } = await supabase
      .from("deliverables")
      .insert(deliverablesToInsert)
      .select();

    if (delivError) throw delivError;

    // Insert tasks for each deliverable
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
      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert);
      if (tasksError) throw tasksError;
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err) {
    console.error("[api/goals POST] Error:", err);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
