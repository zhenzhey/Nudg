import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planGoal } from "@/lib/ai";
import { z } from "zod";

const InterviewAnswerSchema = z.object({
  question: z.string(),
  dimension: z.enum(["baseline", "definition_of_done", "constraints"]),
  answer: z.string(),
  selected_option_index: z.number().int().nullable(),
});

const RequestSchema = z.object({
  goal: z.string().min(10).max(500),
  duration_hint: z.number().int().min(1).max(12).optional(),
  intensity: z.enum(["casual", "steady", "intense"]).default("steady"),
  interview: z.array(InterviewAnswerSchema).optional(),
  // Free-form user guidance for regeneration ("make week 1 lighter", etc.)
  instructions: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await planGoal(
      parsed.data.goal,
      parsed.data.duration_hint ?? 4,
      parsed.data.intensity,
      parsed.data.interview,
      parsed.data.instructions
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ai/plan] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
