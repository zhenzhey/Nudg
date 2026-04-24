import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestNextSteps } from "@/lib/ai";
import { z } from "zod";

const RequestSchema = z.object({
  deliverable_title: z.string().min(1),
  deliverable_description: z.string().optional(),
  project_title: z.string().min(1),
  count: z.union([z.literal(1), z.literal(3)]).default(3),
});

// Returns task suggestions without persisting them to DB (used during project review)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { deliverable_title, deliverable_description, project_title, count } = parsed.data;

    const suggestions = await suggestNextSteps(
      {
        deliverableTitle: deliverable_title,
        deliverableDescription: deliverable_description ?? null,
        projectTitle: project_title,
        projectDescription: null,
        existingPendingTasks: [],
        completedTasks: [],
        recentInbox: [],
      },
      count
    );

    return NextResponse.json({ tasks: suggestions });
  } catch (err) {
    console.error("[api/ai/suggest-tasks POST]", err);
    return NextResponse.json({ error: "Failed to suggest tasks" }, { status: 500 });
  }
}
