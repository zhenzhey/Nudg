-- Add scheduled_time to persist calendar position (hours as float, e.g. 14.5 = 2:30pm)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time float;
