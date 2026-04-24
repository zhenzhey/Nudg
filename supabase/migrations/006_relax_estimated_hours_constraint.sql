ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_estimated_hours_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_estimated_hours_check CHECK (estimated_hours > 0);
