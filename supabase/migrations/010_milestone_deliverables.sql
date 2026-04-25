-- Move deliverables from rigid weekly cadence to milestone-based scheduling.
-- New plans set order_index + due_date + estimated_hours and leave week_number null.
-- Legacy rows keep their week_number; we backfill order_index from it.

ALTER TABLE deliverables ALTER COLUMN week_number DROP NOT NULL;
ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS deliverables_goal_id_week_number_key;

ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,1);

UPDATE deliverables SET order_index = week_number WHERE order_index IS NULL;

ALTER TABLE deliverables ALTER COLUMN order_index SET NOT NULL;

CREATE INDEX IF NOT EXISTS deliverables_goal_order_idx
  ON deliverables (goal_id, order_index);
