import { supabase } from '@/shared/lib/supabase';
import type { GoalParticipant, InviteDetails } from '../types/invite.types';
import {
  mapDbParticipantToParticipant,
  isValidDbParticipant,
  isValidDbParticipantArray,
} from '../types/invite.types';
import { mapDbGoalToGoal } from '@/features/goals';
import type { DbGoal } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

// Type guard for goal data
function isValidDbGoal(data: unknown): data is DbGoal {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'title' in data &&
    typeof data.title === 'string' &&
    'description' in data &&
    typeof data.description === 'string' &&
    'deadline' in data &&
    typeof data.deadline === 'string' &&
    'status' in data &&
    typeof data.status === 'string' &&
    'stake_amount_cents' in data &&
    typeof data.stake_amount_cents === 'number' &&
    'created_at' in data &&
    typeof data.created_at === 'string' &&
    'updated_at' in data &&
    typeof data.updated_at === 'string'
  );
}

// Type guard for participant with goal_id
interface ParticipantGoalId {
  goal_id: string;
}

function isValidParticipantGoalId(data: unknown): data is ParticipantGoalId {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return 'goal_id' in data && typeof data.goal_id === 'string';
}

// Type guard for profile with username
interface ProfileWithUsername {
  username: string | null;
}

function isValidProfileWithUsername(data: unknown): data is ProfileWithUsername {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return 'username' in data && (data.username === null || typeof data.username === 'string');
}

// Type guard for participant existence check
interface ParticipantIdOnly {
  id: string;
}

function isValidParticipantId(data: unknown): data is ParticipantIdOnly {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return 'id' in data && typeof data.id === 'string';
}

export const inviteService = {
  async createInvite(goalId: string): Promise<Result<string>> {
    // Generate invite code using database function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');

    if (codeError !== null) {
      return { success: false, error: new Error(codeError.message) };
    }

    if (typeof codeData !== 'string') {
      return { success: false, error: new Error('Failed to generate invite code') };
    }

    const inviteCode = codeData;

    // Update the owner's participant record with the invite code
    const { error } = await supabase
      .from('goal_participants')
      .update({ invite_code: inviteCode, invited_at: new Date().toISOString() })
      .eq('goal_id', goalId)
      .eq('role', 'owner');

    if (error !== null) {
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
      .select('goal_id')
      .eq('invite_code', inviteCode)
      .single();

    if (participantError !== null) {
      return { success: false, error: new Error('Invalid invite code') };
    }

    if (!isValidParticipantGoalId(participantData)) {
      return { success: false, error: new Error('Invalid data received') };
    }

    // Fetch the goal separately
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', participantData.goal_id)
      .single();

    if (goalError !== null || !isValidDbGoal(goalData)) {
      return { success: false, error: new Error('Goal not found') };
    }

    const goal = mapDbGoalToGoal(goalData);

    // Get owner's username
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', goal.userId)
      .single();

    let ownerUsername: string | null = null;
    if (isValidProfileWithUsername(profileData)) {
      ownerUsername = profileData.username;
    }

    // Check if current user is already a participant
    let isAlreadyParticipant = false;
    if (currentUserId !== undefined) {
      const { data: existingParticipant } = await supabase
        .from('goal_participants')
        .select('id')
        .eq('goal_id', goal.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      isAlreadyParticipant = isValidParticipantId(existingParticipant);
    }

    return {
      success: true,
      data: {
        goal,
        ownerUsername,
        isAlreadyParticipant,
      },
    };
  },

  async joinGoal(goalId: string, userId: string): Promise<Result<GoalParticipant>> {
    const { data, error } = await supabase
      .from('goal_participants')
      .insert({
        goal_id: goalId,
        user_id: userId,
        role: 'partner',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error !== null) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return { success: false, error: new Error('You are already a partner for this goal') };
      }
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbParticipant(data)) {
      return { success: false, error: new Error('Invalid participant data received') };
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

    if (!isValidDbParticipantArray(data)) {
      return { success: false, error: new Error('Invalid participants data received') };
    }

    return { success: true, data: data.map(mapDbParticipantToParticipant) };
  },

  async getExistingInviteCode(goalId: string): Promise<Result<string | null>> {
    const { data, error } = await supabase
      .from('goal_participants')
      .select('invite_code')
      .eq('goal_id', goalId)
      .eq('role', 'owner')
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data === null || typeof data !== 'object' || !('invite_code' in data)) {
      return { success: true, data: null };
    }

    const inviteCode = data.invite_code;
    if (inviteCode === null || typeof inviteCode !== 'string') {
      return { success: true, data: null };
    }

    return { success: true, data: inviteCode };
  },
};
