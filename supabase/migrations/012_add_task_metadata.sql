-- Free-form per-task AI metadata. Currently used for:
--   start_step  — a 5-minute kickoff action to lower startup friction
--   ai_assist   — short hint of how AI can help with the task
-- Kept as JSONB so future AI-derived fields don't each need a column.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB;
