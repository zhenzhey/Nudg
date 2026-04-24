import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, image_url, project_id, deliverable_id } = await req.json();

  if (!content?.trim() && !image_url) {
    return NextResponse.json({ error: "Content or image required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inbox")
    .insert({
      user_id: user.id,
      content: content?.trim() || null,
      image_url: image_url || null,
      project_id: project_id || null,
      deliverable_id: deliverable_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("inbox")
    .select("*, goals(title), deliverables(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
