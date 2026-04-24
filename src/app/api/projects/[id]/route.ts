import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("goals")
      .select(`*, deliverables(*, tasks(*))`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    data.deliverables?.sort(
      (a: { week_number: number }, b: { week_number: number }) => a.week_number - b.week_number
    );
    data.deliverables?.forEach((d: { tasks?: { created_at: string }[] }) => {
      d.tasks?.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[api/projects/[id] GET]", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

const UpdateProjectSchema = z.object({
  status: z.enum(["active", "completed", "abandoned"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("goals")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[api/projects/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/projects/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
