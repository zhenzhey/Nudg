import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeDueDates } from "@/lib/utils";
import { z } from "zod";

const DeliverableSchema = z.object({
  order_index: z.number().int().min(0),
  title: z.string().min(1),
  description: z.string().optional(),
  outcome_description: z.string().optional(),
  estimated_hours: z.number().positive().optional(),
  verification_type: z
    .enum(["manual_upload", "github_commit", "google_doc", "screenshot", "referee_approval"])
    .default("manual_upload"),
});

const InterviewAnswerSchema = z.object({
  question: z.string(),
  dimension: z.enum(["baseline", "definition_of_done", "constraints"]),
  answer: z.string(),
  selected_option_index: z.number().int().nullable(),
});

const CreateProjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  duration_weeks: z.number().int().min(1).max(12),
  ai_plan: z.any().optional(),
  interview: z.array(InterviewAnswerSchema).optional(),
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

    const { deliverables: deliverableData, interview, ...questData } = parsed.data;

    const { data: quest, error: questError } = await supabase
      .from("goals")
      .insert({
        ...questData,
        user_id: user.id,
        clarification_data: interview ?? null,
      })
      .select()
      .single();

    if (questError) throw questError;

    const dueDateByIndex = computeDueDates(
      deliverableData.map((d) => ({
        order_index: d.order_index,
        estimated_hours: d.estimated_hours ?? null,
      })),
      quest.start_date,
      questData.duration_weeks
    );

    const deliverablesToInsert = deliverableData.map((d) => ({
      goal_id: quest.id,
      // week_number left null on variable-sized plans; UI derives sequence
      // from order_index and timing from due_date.
      week_number: null,
      order_index: d.order_index,
      title: d.title,
      description: d.description,
      outcome_description: d.outcome_description,
      estimated_hours: d.estimated_hours ?? null,
      verification_type: d.verification_type,
      due_date: dueDateByIndex.get(d.order_index) ?? null,
    }));

    const { error: delivError } = await supabase
      .from("deliverables")
      .insert(deliverablesToInsert);

    if (delivError) throw delivError;

    return NextResponse.json({ project: quest }, { status: 201 });
  } catch (err) {
    console.error("[api/projects POST]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
