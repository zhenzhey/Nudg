import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateClarifyingQuestions } from "@/lib/ai";
import { z } from "zod";

const RequestSchema = z.object({
  goal: z.string().min(10).max(500),
  duration_hint: z.number().int().min(1).max(12).optional(),
  intensity: z.enum(["casual", "steady", "intense"]).optional(),
});

export async function POST(request: Request) {
  console.log("\n[api/ai/clarify] ▶ POST received");
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[api/ai/clarify] unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[api/ai/clarify] invalid input:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await generateClarifyingQuestions(
      parsed.data.goal,
      parsed.data.duration_hint,
      parsed.data.intensity
    );
    console.log(
      `[api/ai/clarify] ◀ status=${result.status} ${result.questions.length} question(s)`
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ai/clarify] Error:", err);
    return NextResponse.json({
      questions: [],
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
