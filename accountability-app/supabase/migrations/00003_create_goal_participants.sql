-- Participant role enum
CREATE TYPE participant_role AS ENUM ('owner', 'partner');

-- Goal participants (for accountability partners)
CREATE TABLE goal_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'partner',

  -- Invite tracking
  invite_code TEXT UNIQUE,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One entry per user per goal
  CONSTRAINT goal_participants_unique UNIQUE (goal_id, user_id)
);

-- Updated at trigger
CREATE TRIGGER update_goal_participants_updated_at
  BEFORE UPDATE ON goal_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE goal_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view participants for goals they're part of
CREATE POLICY "Users can view participants of their goals"
  ON goal_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    goal_id IN (SELECT goal_id FROM goal_participants WHERE user_id = auth.uid())
  );

-- Only goal owners can invite
CREATE POLICY "Goal owners can create participants"
  ON goal_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- Allow users to join via invite (update their own record)
CREATE POLICY "Users can update their own participation"
  ON goal_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX goal_participants_goal_id_idx ON goal_participants(goal_id);
CREATE INDEX goal_participants_user_id_idx ON goal_participants(user_id);
CREATE INDEX goal_participants_invite_code_idx ON goal_participants(invite_code);

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add owner as participant when goal is created
CREATE OR REPLACE FUNCTION add_goal_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO goal_participants (goal_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.user_id, 'owner', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_created_add_owner
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION add_goal_owner_as_participant();
