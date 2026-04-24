-- Add verification_type to deliverables
-- Determines how a deliverable submission is verified

ALTER TABLE deliverables
  ADD COLUMN IF NOT EXISTS verification_type TEXT NOT NULL DEFAULT 'manual_upload'
    CHECK (verification_type IN (
      'manual_upload',
      'github_commit',
      'google_doc',
      'screenshot',
      'referee_approval'
    ));