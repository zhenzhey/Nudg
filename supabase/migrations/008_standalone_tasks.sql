-- Allow tasks without a deliverable (standalone calendar tasks)
ALTER TABLE tasks ALTER COLUMN deliverable_id DROP NOT NULL;

-- Add user_id for ownership of standalone tasks and direct RLS path
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from deliverable → goal for existing tasks
UPDATE tasks SET user_id = goals.user_id
FROM deliverables
JOIN goals ON goals.id = deliverables.goal_id
WHERE deliverables.id = tasks.deliverable_id
  AND tasks.user_id IS NULL;

-- Allow scheduled_date and scheduled_time to be set at creation time (already nullable, no change needed)

-- Rebuild RLS policies to handle both standalone (user_id) and deliverable-linked tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks for own deliverables" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deliverables
      JOIN goals ON goals.id = deliverables.goal_id
      WHERE deliverables.id = tasks.deliverable_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deliverables
      JOIN goals ON goals.id = deliverables.goal_id
      WHERE deliverables.id = tasks.deliverable_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deliverables
      JOIN goals ON goals.id = deliverables.goal_id
      WHERE deliverables.id = tasks.deliverable_id
        AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deliverables
      JOIN goals ON goals.id = deliverables.goal_id
      WHERE deliverables.id = tasks.deliverable_id
        AND goals.user_id = auth.uid()
    )
  );
