import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/google/oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function redirectWithError(reason: string) {
  return NextResponse.redirect(`${APP_URL}/dashboard?google_error=${encodeURIComponent(reason)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return redirectWithError(error);
  if (!code || !state) return redirectWithError("missing_code_or_state");

  // CSRF check: the state cookie set by /api/auth/google must match.
  const cookieState = request.cookies.get("google_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return redirectWithError("state_mismatch");
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWithError("not_logged_in");

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (e) {
    console.error("[google-callback] token exchange failed", e);
    return redirectWithError("token_exchange_failed");
  }

  const googleEmail = await fetchGoogleEmail(tokens.access_token);
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Service role bypasses RLS; tokens must never be writable by client roles.
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error: upsertError } = await admin
    .from("google_calendar_tokens")
    .upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        // Only overwrite refresh_token if Google returned a new one.
        // (prompt=consent guarantees it, but be defensive.)
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: expiryDate,
        google_email: googleEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("[google-callback] upsert failed", upsertError);
    return redirectWithError("db_write_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/dashboard?google_connected=1`);
  res.cookies.delete("google_oauth_state");
  return res;
}
