-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');

-- User subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  product_id TEXT,

  -- Apple transaction tracking
  original_transaction_id TEXT UNIQUE,
  latest_receipt TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Trial tracking
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  has_used_trial BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own subscription (only once)
CREATE POLICY "Users can create own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for user lookup
CREATE INDEX user_subscriptions_user_id_idx ON user_subscriptions(user_id);
CREATE INDEX user_subscriptions_expires_at_idx ON user_subscriptions(expires_at);

-- Create default free subscription when user signs up
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();
