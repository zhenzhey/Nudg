-- Add scheduled_date to tasks for dashboard calendar scheduling
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date date;
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
