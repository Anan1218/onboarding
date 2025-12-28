# Phase 6: Accountability Partner (Invite Link)

**Goal:** Share a link, friend opens it, joins as accountability partner
**Test:** Create goal → copy link → friend opens → friend can view goal progress

**Note:** This is NOT crypto betting. Partners can view and encourage, but money stays with solo stakes (Apple Trial).

---

## Prerequisites

- Phase 5 completed
- Goals can be created

---

## Step 1: Create Goal Participants Table

Run this SQL in Supabase SQL Editor:

```sql
-- supabase/migrations/00003_create_goal_participants.sql

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
```

---

## Step 2: Update Database Types

```typescript
// shared/types/database.types.ts
// Add to existing file:

export type ParticipantRole = 'owner' | 'partner';

// Add to Tables interface:
goal_participants: {
  Row: {
    id: string;
    goal_id: string;
    user_id: string;
    role: ParticipantRole;
    invite_code: string | null;
    invited_at: string | null;
    joined_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    goal_id: string;
    user_id: string;
    role?: ParticipantRole;
    invite_code?: string | null;
    invited_at?: string | null;
    joined_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    goal_id?: string;
    user_id?: string;
    role?: ParticipantRole;
    invite_code?: string | null;
    invited_at?: string | null;
    joined_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

export type GoalParticipant = Tables<'goal_participants'>;
```

---

## Step 3: Create Invite Types

```typescript
// features/invite/types/invite.types.ts
import type { ParticipantRole } from '@/shared/types/database.types';
import type { Goal } from '@/features/goals';

export interface GoalParticipant {
  id: string;
  goalId: string;
  userId: string;
  role: ParticipantRole;
  inviteCode: string | null;
  invitedAt: Date | null;
  joinedAt: Date | null;
}

export interface InviteInfo {
  inviteCode: string;
  goal: Goal;
  ownerUsername: string | null;
}

export function mapDbParticipantToParticipant(dbParticipant: {
  id: string;
  goal_id: string;
  user_id: string;
  role: ParticipantRole;
  invite_code: string | null;
  invited_at: string | null;
  joined_at: string | null;
}): GoalParticipant {
  return {
    id: dbParticipant.id,
    goalId: dbParticipant.goal_id,
    userId: dbParticipant.user_id,
    role: dbParticipant.role,
    inviteCode: dbParticipant.invite_code,
    invitedAt: dbParticipant.invited_at !== null ? new Date(dbParticipant.invited_at) : null,
    joinedAt: dbParticipant.joined_at !== null ? new Date(dbParticipant.joined_at) : null
  };
}
```

---

## Step 4: Create Invite Service

```typescript
// features/invite/services/inviteService.ts
import { supabase } from '@/shared/lib/supabase';
import type { GoalParticipant } from '../types/invite.types';
import { mapDbParticipantToParticipant } from '../types/invite.types';
import { mapDbGoalToGoal } from '@/features/goals';
import type { Goal } from '@/features/goals';
import type { Result } from '@/shared/types/common.types';

interface InviteDetails {
  goal: Goal;
  ownerUsername: string | null;
  isAlreadyParticipant: boolean;
}

export const inviteService = {
  async createInvite(goalId: string): Promise<Result<string>> {
    // Generate invite code
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_invite_code');

    if (codeError !== null) {
      return { success: false, error: new Error(codeError.message) };
    }

    const inviteCode = codeData as string;

    // Create a placeholder participant with invite code
    // The actual user_id will be set when someone joins
    const { error } = await supabase
      .from('goal_participants')
      .update({ invite_code: inviteCode, invited_at: new Date().toISOString() })
      .eq('goal_id', goalId)
      .eq('role', 'owner');

    if (error !== null) {
      // If owner doesn't have invite code slot, create new record
      // This shouldn't happen with our trigger, but handle it
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: inviteCode };
  },

  async getInviteDetails(
    inviteCode: string,
    currentUserId: string | undefined
  ): Promise<Result<InviteDetails>> {
    // Find the participant record with this invite code
    const { data: participantData, error: participantError } = await supabase
      .from('goal_participants')
      .select(`
        goal_id,
        goals (
          id,
          user_id,
          title,
          description,
          deadline,
          status,
          stake_amount_cents,
          subscription_id,
          subscription_product_id,
          created_at,
          updated_at
        )
      `)
      .eq('invite_code', inviteCode)
      .single();

    if (participantError !== null) {
      return { success: false, error: new Error('Invalid invite code') };
    }

    // Type assertion needed due to Supabase join typing limitations
    const goalData = participantData.goals as unknown as {
      id: string;
      user_id: string;
      title: string;
      description: string;
      deadline: string;
      status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
      stake_amount_cents: number;
      subscription_id: string | null;
      subscription_product_id: string | null;
      created_at: string;
      updated_at: string;
    };

    if (goalData === null) {
      return { success: false, error: new Error('Goal not found') };
    }

    const goal = mapDbGoalToGoal(goalData);

    // Get owner's username
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', goal.userId)
      .single();

    // Check if current user is already a participant
    let isAlreadyParticipant = false;
    if (currentUserId !== undefined) {
      const { data: existingParticipant } = await supabase
        .from('goal_participants')
        .select('id')
        .eq('goal_id', goal.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      isAlreadyParticipant = existingParticipant !== null;
    }

    return {
      success: true,
      data: {
        goal,
        ownerUsername: profileData?.username ?? null,
        isAlreadyParticipant
      }
    };
  },

  async joinGoal(goalId: string, userId: string): Promise<Result<GoalParticipant>> {
    const { data, error } = await supabase
      .from('goal_participants')
      .insert({
        goal_id: goalId,
        user_id: userId,
        role: 'partner',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error !== null) {
      if (error.message.includes('duplicate')) {
        return { success: false, error: new Error('You are already a partner for this goal') };
      }
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: mapDbParticipantToParticipant(data) };
  },

  async getParticipants(goalId: string): Promise<Result<GoalParticipant[]>> {
    const { data, error } = await supabase
      .from('goal_participants')
      .select('*')
      .eq('goal_id', goalId)
      .order('joined_at', { ascending: true });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: data.map(mapDbParticipantToParticipant) };
  }
};
```

---

## Step 5: Create Invite Hook

```typescript
// features/invite/hooks/useInvite.ts
import { useState, useCallback } from 'react';
import { inviteService } from '../services/inviteService';
import type { Result } from '@/shared/types/common.types';

interface UseInviteReturn {
  inviteCode: string | null;
  isLoading: boolean;
  error: Error | null;
  createInvite: (goalId: string) => Promise<Result<string>>;
}

export function useInvite(): UseInviteReturn {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createInvite = useCallback(async (goalId: string): Promise<Result<string>> => {
    setIsLoading(true);
    setError(null);

    const result = await inviteService.createInvite(goalId);

    if (result.success) {
      setInviteCode(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
    return result;
  }, []);

  return { inviteCode, isLoading, error, createInvite };
}
```

---

## Step 6: Create Invite Link Component

```typescript
// features/invite/components/InviteLink.tsx
import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/shared/components/Button';
import { useInvite } from '../hooks/useInvite';

interface InviteLinkProps {
  goalId: string;
}

export function InviteLink({ goalId }: InviteLinkProps): JSX.Element {
  const { inviteCode, isLoading, createInvite } = useInvite();
  const [copied, setCopied] = useState(false);

  async function handleCreateInvite(): Promise<void> {
    const result = await createInvite(goalId);
    if (!result.success) {
      Alert.alert('Error', 'Failed to create invite link');
    }
  }

  async function handleCopy(): Promise<void> {
    if (inviteCode === null) return;

    const link = `accountability://join/${inviteCode}`;
    await Clipboard.setStringAsync(link);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteCode === null) {
    return (
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-700 mb-3">
          Invite an accountability partner to help keep you on track!
        </Text>
        <Button
          title="Create Invite Link"
          onPress={(): void => void handleCreateInvite()}
          loading={isLoading}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-xl p-4">
      <Text className="text-sm text-gray-600 mb-2">Share this code with your partner:</Text>

      <View className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        <Text className="text-center text-2xl font-mono font-bold text-gray-900 tracking-widest">
          {inviteCode}
        </Text>
      </View>

      <Pressable
        onPress={(): void => void handleCopy()}
        className={`py-3 rounded-lg items-center ${
          copied ? 'bg-green-100' : 'bg-primary-100'
        }`}
      >
        <Text className={`font-semibold ${copied ? 'text-green-700' : 'text-primary-700'}`}>
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </Text>
      </Pressable>

      <Text className="text-xs text-gray-500 text-center mt-2">
        Or share: accountability://join/{inviteCode}
      </Text>
    </View>
  );
}
```

---

## Step 7: Install Clipboard Package

```bash
npx expo install expo-clipboard
```

---

## Step 8: Create Join Screen

```typescript
// app/join/[code].tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { inviteService } from '@/features/invite/services/inviteService';
import type { Goal } from '@/features/goals';
import { formatRelativeDate } from '@/shared/utils/formatters';

interface InviteDetails {
  goal: Goal;
  ownerUsername: string | null;
  isAlreadyParticipant: boolean;
}

export default function JoinScreen(): JSX.Element {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite(): Promise<void> {
      if (code === undefined) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      const result = await inviteService.getInviteDetails(code, user?.id);

      if (!result.success) {
        setError(result.error.message);
      } else {
        setInviteDetails(result.data);
      }

      setIsLoading(false);
    }

    if (!authLoading) {
      void loadInvite();
    }
  }, [code, user?.id, authLoading]);

  async function handleJoin(): Promise<void> {
    if (inviteDetails === null || user === null) return;

    setIsJoining(true);

    const result = await inviteService.joinGoal(inviteDetails.goal.id, user.id);

    setIsJoining(false);

    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }

    Alert.alert('Success', 'You are now an accountability partner!', [
      { text: 'View Goal', onPress: (): void => router.replace(`/goal/${inviteDetails.goal.id}`) }
    ]);
  }

  function handleLoginFirst(): void {
    // Store invite code to rejoin after login
    router.push(`/(auth)/login?redirect=/join/${code ?? ''}`);
  }

  if (isLoading || authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Join Goal' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Invalid Invite' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center text-lg mb-4">{error}</Text>
          <Button
            title="Go Home"
            onPress={(): void => router.replace('/')}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (inviteDetails === null) {
    return null;
  }

  const { goal, ownerUsername, isAlreadyParticipant } = inviteDetails;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Join as Partner' }} />
      <View className="flex-1 p-6">
        {/* Goal Info */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
            <Text className="text-2xl">🎯</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-1">You're invited to support</Text>
          <Text className="text-xl font-bold text-gray-900 text-center">{goal.title}</Text>
          {ownerUsername !== null && (
            <Text className="text-gray-600 mt-1">by {ownerUsername}</Text>
          )}
        </View>

        {/* Goal Details */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="text-gray-600 mb-3">{goal.description}</Text>
          <Text className="text-sm text-gray-500">
            Deadline: {formatRelativeDate(goal.deadline)}
          </Text>
        </View>

        {/* What Partners Do */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            As an accountability partner, you can:
          </Text>
          <View className="gap-2">
            <PartnerBenefit text="View their progress and proof submissions" />
            <PartnerBenefit text="Get notified when they submit proof" />
            <PartnerBenefit text="Encourage them to stay on track" />
          </View>
        </View>

        {/* Actions */}
        <View className="flex-1" />

        {!isAuthenticated ? (
          <View className="gap-3">
            <Button title="Log In to Join" onPress={handleLoginFirst} />
            <Button
              title="Create Account"
              onPress={(): void => router.push('/(auth)/signup')}
              variant="secondary"
            />
          </View>
        ) : isAlreadyParticipant ? (
          <View className="bg-green-50 p-4 rounded-xl items-center">
            <Text className="text-green-700 font-medium">
              You're already a partner for this goal!
            </Text>
            <Button
              title="View Goal"
              onPress={(): void => router.replace(`/goal/${goal.id}`)}
              variant="secondary"
            />
          </View>
        ) : (
          <Button
            title="Join as Accountability Partner"
            onPress={(): void => void handleJoin()}
            loading={isJoining}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function PartnerBenefit({ text }: { text: string }): JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-green-600">✓</Text>
      <Text className="text-gray-700 flex-1">{text}</Text>
    </View>
  );
}
```

---

## Step 9: Update Goal Detail to Show Invite & Partners

```typescript
// app/goal/[id].tsx
// Add to existing file - update the component

import { View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { useGoal } from '@/features/goals/hooks/useGoal';
import { InviteLink } from '@/features/invite/components/InviteLink';
import { ParticipantsList } from '@/features/invite/components/ParticipantsList';
import { formatDate, formatCurrency } from '@/shared/utils/formatters';

export default function GoalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { goal, isLoading, error, updateStatus } = useGoal(id);

  // ... keep existing handleCancel and loading/error states

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null || goal === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center">
            {error?.message ?? 'Goal not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = goal.userId === user?.id;
  const isActive = goal.status === 'active' || goal.status === 'pending';

  async function handleCancel(): Promise<void> {
    Alert.alert('Cancel Goal', 'Are you sure you want to cancel this goal?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          const result = await updateStatus('cancelled');
          if (result.success) {
            router.back();
          } else {
            Alert.alert('Error', 'Failed to cancel goal');
          }
        }
      }
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: goal.title }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Title & Status - keep existing */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</Text>
          <StatusBadge status={goal.status} />
        </View>

        {/* Description - keep existing */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-1">
            What the photo should show:
          </Text>
          <Text className="text-gray-900">{goal.description}</Text>
        </View>

        {/* Details - keep existing */}
        <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-6">
          <DetailRow label="Deadline" value={formatDate(goal.deadline)} />
          <DetailRow
            label="Stake"
            value={goal.stakeAmountCents > 0 ? formatCurrency(goal.stakeAmountCents) : 'Free'}
          />
          <DetailRow label="Created" value={formatDate(goal.createdAt)} />
        </View>

        {/* Participants */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Accountability Partners
          </Text>
          <ParticipantsList goalId={goal.id} />
        </View>

        {/* Invite Link (only for owner) */}
        {isOwner && isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Invite Partner
            </Text>
            <InviteLink goalId={goal.id} />
          </View>
        )}

        {/* Proof Upload Section - Placeholder for Phase 7 */}
        {isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Submit Proof
            </Text>
            <View className="bg-gray-100 rounded-xl p-6 items-center">
              <Text className="text-gray-500 text-center">
                Photo upload coming in Phase 7
              </Text>
            </View>
          </View>
        )}

        {/* Actions (only for owner) */}
        {isOwner && isActive && (
          <View className="mt-4">
            <Button
              title="Cancel Goal"
              onPress={(): void => void handleCancel()}
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep existing StatusBadge and DetailRow components
```

---

## Step 10: Create Participants List Component

```typescript
// features/invite/components/ParticipantsList.tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { inviteService } from '../services/inviteService';
import { supabase } from '@/shared/lib/supabase';
import type { GoalParticipant } from '../types/invite.types';

interface ParticipantsListProps {
  goalId: string;
}

interface ParticipantWithProfile extends GoalParticipant {
  username: string | null;
  email: string | null;
}

export function ParticipantsList({ goalId }: ParticipantsListProps): JSX.Element {
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadParticipants(): Promise<void> {
      const result = await inviteService.getParticipants(goalId);

      if (result.success) {
        // Fetch profiles for each participant
        const withProfiles = await Promise.all(
          result.data.map(async (p) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', p.userId)
              .single();

            const { data: auth } = await supabase.auth.admin.getUserById(p.userId)
              .catch(() => ({ data: null }));

            return {
              ...p,
              username: profile?.username ?? null,
              email: null // Can't access other users' emails due to privacy
            };
          })
        );

        setParticipants(withProfiles);
      }

      setIsLoading(false);
    }

    void loadParticipants();
  }, [goalId]);

  if (isLoading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#0284c7" />
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-500 text-center">No partners yet</Text>
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-xl p-4 gap-3">
      {participants.map((participant) => (
        <ParticipantRow key={participant.id} participant={participant} />
      ))}
    </View>
  );
}

interface ParticipantRowProps {
  participant: ParticipantWithProfile;
}

function ParticipantRow({ participant }: ParticipantRowProps): JSX.Element {
  const displayName = participant.username ?? 'Anonymous';
  const isOwner = participant.role === 'owner';

  return (
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
        <Text className="text-primary-600 font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-medium text-gray-900">{displayName}</Text>
        <Text className="text-xs text-gray-500">
          {isOwner ? 'Goal Owner' : 'Partner'}
        </Text>
      </View>
      {isOwner && (
        <View className="bg-primary-100 px-2 py-1 rounded">
          <Text className="text-xs text-primary-700">Owner</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Step 11: Configure Deep Links

```json
// app.json - update expo section
{
  "expo": {
    "scheme": "accountability",
    "plugins": [
      "expo-router"
    ]
  }
}
```

---

## Step 12: Export Invite Feature

```typescript
// features/invite/index.ts
export { inviteService } from './services/inviteService';
export { useInvite } from './hooks/useInvite';
export { InviteLink } from './components/InviteLink';
export { ParticipantsList } from './components/ParticipantsList';
export type { GoalParticipant, InviteInfo } from './types/invite.types';
```

---

## Verification Checklist

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. App starts without errors
npx expo start
```

### Manual Testing

1. **Create goal**: Make a new goal
2. **View goal**: See "Accountability Partners" section (just you as owner)
3. **Create invite**: Tap "Create Invite Link"
4. **See code**: 8-character code displayed
5. **Copy link**: Tap copy, verify in clipboard
6. **Open link**: On another device/account, open `accountability://join/CODE`
7. **See join page**: Goal info displayed, owner name shown
8. **Join goal**: Tap "Join as Accountability Partner"
9. **Verify**: Back on original account, see partner listed
10. **Supabase check**: View goal_participants table

---

## Files Created/Modified

```
accountability-app/
├── app/
│   ├── goal/
│   │   └── [id].tsx            # MODIFIED
│   └── join/
│       └── [code].tsx          # NEW
├── features/
│   └── invite/
│       ├── components/
│       │   ├── InviteLink.tsx    # NEW
│       │   └── ParticipantsList.tsx # NEW
│       ├── hooks/
│       │   └── useInvite.ts      # NEW
│       ├── services/
│       │   └── inviteService.ts  # NEW
│       ├── types/
│       │   └── invite.types.ts   # NEW
│       └── index.ts              # NEW
├── shared/
│   └── types/
│       └── database.types.ts     # MODIFIED
└── supabase/
    └── migrations/
        └── 00003_create_goal_participants.sql # NEW
```

---

## Database State After Phase 6

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profile data | Enabled |
| goals | User goals with deadlines and stakes | Enabled |
| goal_participants | Goal owners and partners | Enabled |

---

## Next Phase

Proceed to [Phase 7: Photo Upload](./phase-07-photo-upload.md) to add proof submissions.
