import type { ParticipantRole, DbGoalParticipant } from '@/shared/types/database.types';
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

export interface InviteDetails {
  goal: Goal;
  ownerUsername: string | null;
  isAlreadyParticipant: boolean;
}

export function mapDbParticipantToParticipant(dbParticipant: DbGoalParticipant): GoalParticipant {
  return {
    id: dbParticipant.id,
    goalId: dbParticipant.goal_id,
    userId: dbParticipant.user_id,
    role: dbParticipant.role,
    inviteCode: dbParticipant.invite_code,
    invitedAt: dbParticipant.invited_at !== null ? new Date(dbParticipant.invited_at) : null,
    joinedAt: dbParticipant.joined_at !== null ? new Date(dbParticipant.joined_at) : null,
  };
}

// Type guard for validating participant data from Supabase
export function isValidDbParticipant(data: unknown): data is DbGoalParticipant {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'goal_id' in data &&
    typeof data.goal_id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'role' in data &&
    (data.role === 'owner' || data.role === 'partner') &&
    'created_at' in data &&
    typeof data.created_at === 'string' &&
    'updated_at' in data &&
    typeof data.updated_at === 'string'
  );
}

export function isValidDbParticipantArray(data: unknown): data is DbGoalParticipant[] {
  return Array.isArray(data) && data.every(isValidDbParticipant);
}
