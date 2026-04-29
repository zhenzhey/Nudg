-- Tracks when a user explicitly chose to "Keep" a task despite a Google
-- Calendar conflict. Reset to NULL by the app whenever the task is rescheduled,
-- so a fresh conflict on a new slot can re-surface.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS conflict_dismissed_at TIMESTAMPTZ;
