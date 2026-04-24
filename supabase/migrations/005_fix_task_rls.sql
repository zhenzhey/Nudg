-- Add missing DELETE policy for tasks
-- Previously only SELECT, INSERT, UPDATE existed — DELETE was silently blocked by RLS
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM deliverables
      JOIN goals ON goals.id = deliverables.goal_id
      WHERE deliverables.id = tasks.deliverable_id
        AND goals.user_id = auth.uid()
    )
  );
