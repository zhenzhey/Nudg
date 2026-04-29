import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listPrimaryBusy } from "@/lib/google/calendar";
import { isGoogleConnected, GoogleNotConnectedError } from "@/lib/google/token";

// GET /api/google/events?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns the user's primary-calendar events for the date range, used by the
// dashboard schedule view to show non-Nudg meetings as read-only context.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
    }

    if (!(await isGoogleConnected(user.id))) {
      return NextResponse.json({ connected: false, events: [] });
    }

    try {
      const busy = await listPrimaryBusy(
        user.id,
        new Date(`${from}T00:00:00`),
        new Date(`${to}T23:59:59`)
      );
      const events = busy.map((b, i) => ({
        id: `g-${i}-${b.start.getTime()}`,
        title: b.title ?? "(busy)",
        startISO: b.start.toISOString(),
        endISO: b.end.toISOString(),
      }));
      return NextResponse.json({ connected: true, events });
    } catch (e) {
      if (e instanceof GoogleNotConnectedError) {
        return NextResponse.json({ connected: false, events: [] });
      }
      throw e;
    }
  } catch (err) {
    console.error("[api/google/events]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
