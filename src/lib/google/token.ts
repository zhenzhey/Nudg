// Get a valid (auto-refreshed) Google access token for a user.
// Uses the service-role client because the tokens table is server-only.

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { refreshAccessToken } from "./oauth";

function admin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export class GoogleNotConnectedError extends Error {
  constructor() {
    super("User has not connected Google Calendar");
    this.name = "GoogleNotConnectedError";
  }
}

export interface UserGoogleContext {
  accessToken: string;
  calendarId: string | null;
}

// Refresh if access token is within 60s of expiring.
const REFRESH_BUFFER_MS = 60_000;

export async function getValidAccessToken(userId: string): Promise<string> {
  const sb = admin();
  const { data: row, error } = await sb
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expiry_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new GoogleNotConnectedError();

  const expiresAt = new Date(row.expiry_date).getTime();
  if (expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    // Token expired and no refresh token — user must reconnect.
    throw new GoogleNotConnectedError();
  }

  const refreshed = await refreshAccessToken(row.refresh_token);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await sb
    .from("google_calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      expiry_date: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}

export async function getCalendarId(userId: string): Promise<string | null> {
  const sb = admin();
  const { data } = await sb
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.calendar_id ?? null;
}

export async function setCalendarId(userId: string, calendarId: string): Promise<void> {
  const sb = admin();
  await sb
    .from("google_calendar_tokens")
    .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const sb = admin();
  const { data } = await sb
    .from("google_calendar_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}
