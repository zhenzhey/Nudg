-- Add clarification_data to goals
-- Stores the Q&A transcript captured in the Clarification Interview step
-- before plan generation. Shape: InterviewAnswer[] (see src/types/index.ts).

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS clarification_data JSONB;
