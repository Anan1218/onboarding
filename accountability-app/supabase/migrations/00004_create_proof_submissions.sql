-- Verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Proof submissions table
CREATE TABLE proof_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Image
  image_path TEXT NOT NULL,
  image_url TEXT,  -- Signed URL, regenerated as needed

  -- AI Verification (filled in Phase 8)
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_result JSONB,
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger
CREATE TRIGGER update_proof_submissions_updated_at
  BEFORE UPDATE ON proof_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE proof_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view proofs for goals they participate in
CREATE POLICY "Participants can view proofs"
  ON proof_submissions FOR SELECT
  USING (
    goal_id IN (
      SELECT goal_id FROM goal_participants WHERE user_id = auth.uid()
    )
  );

-- Only goal owner can submit proofs
CREATE POLICY "Goal owners can submit proofs"
  ON proof_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- System can update verification status (via service role)
CREATE POLICY "Users can view their proof updates"
  ON proof_submissions FOR UPDATE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX proof_submissions_goal_id_idx ON proof_submissions(goal_id);
CREATE INDEX proof_submissions_user_id_idx ON proof_submissions(user_id);

-- Storage RLS for proofs bucket (run in Supabase dashboard)
-- Note: Create a bucket named 'proofs' with private access first

-- Allow authenticated users to upload to their own folder
-- CREATE POLICY "Users can upload proofs"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'proofs' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Allow users to read proofs for goals they participate in
-- CREATE POLICY "Participants can view proofs"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'proofs' AND
--   (storage.foldername(name))[1] IN (
--     SELECT gp.user_id::text
--     FROM goal_participants gp
--     WHERE gp.user_id = auth.uid()
--     OR gp.goal_id IN (
--       SELECT goal_id FROM goal_participants WHERE user_id = auth.uid()
--     )
--   )
-- );
