-- Google Calendar integration: link tasks to events, store Nudg sub-calendar id.
ALTER TABLE google_calendar_tokens ADD COLUMN IF NOT EXISTS calendar_id TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Index for reverse lookup (event id → task) used by Google→Nudg sync (Phase 2).
CREATE INDEX IF NOT EXISTS tasks_google_event_id_idx
  ON tasks (google_event_id)
  WHERE google_event_id IS NOT NULL;
