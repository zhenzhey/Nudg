-- Add per-task deadline. Stored as DATE (no time); UI treats it as 23:59:59
-- of the given day for hour-level statistics.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
