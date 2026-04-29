-- Per-user Google Calendar OAuth tokens.
-- One row per user; refresh_token only returned by Google on first consent.
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  token_type TEXT,
  expiry_date TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own token row (e.g. to check connection status from client).
CREATE POLICY "Users read own google tokens"
  ON google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Writes are server-only via service role; no INSERT/UPDATE/DELETE policy for anon/auth.
