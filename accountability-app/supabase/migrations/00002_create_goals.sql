-- Goal status enum
CREATE TYPE goal_status AS ENUM ('pending', 'active', 'completed', 'failed', 'cancelled');

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Timing
  deadline TIMESTAMPTZ NOT NULL,

  -- Status
  status goal_status NOT NULL DEFAULT 'active',

  -- Stake (in cents to avoid floating point issues)
  stake_amount_cents INTEGER NOT NULL DEFAULT 0,

  -- Subscription (filled in Phase 10)
  subscription_id TEXT,
  subscription_product_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX goals_status_idx ON goals(status);
CREATE INDEX goals_deadline_idx ON goals(deadline);
