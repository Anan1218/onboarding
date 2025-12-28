import { supabase } from '@/shared/lib/supabase';
import type { Goal, CreateGoalInput } from '../types/goal.types';
import { mapDbGoalToGoal } from '../types/goal.types';
import type { GoalStatus, DbGoal } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

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

function isValidDbGoalArray(data: unknown): data is DbGoal[] {
  return Array.isArray(data) && data.every(isValidDbGoal);
}

export const goalService = {
  async getByUserId(userId: string): Promise<Result<Goal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbGoalArray(data)) {
      return { success: false, error: new Error('Invalid goals data received') };
    }

    const goals = data.map(mapDbGoalToGoal);
    return { success: true, data: goals };
  },

  async getActiveByUserId(userId: string): Promise<Result<Goal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'active'])
      .order('deadline', { ascending: true });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbGoalArray(data)) {
      return { success: false, error: new Error('Invalid goals data received') };
    }

    const goals = data.map(mapDbGoalToGoal);
    return { success: true, data: goals };
  },

  async getById(goalId: string): Promise<Result<Goal | null>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data === null) {
      return { success: true, data: null };
    }

    if (!isValidDbGoal(data)) {
      return { success: false, error: new Error('Invalid goal data received') };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  },

  async create(userId: string, input: CreateGoalInput): Promise<Result<Goal>> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        deadline: input.deadline.toISOString(),
        stake_amount_cents: input.stakeAmountCents,
        status: 'active',
      })
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbGoal(data)) {
      return { success: false, error: new Error('Invalid goal data received') };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  },

  async updateStatus(goalId: string, status: GoalStatus): Promise<Result<Goal>> {
    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbGoal(data)) {
      return { success: false, error: new Error('Invalid goal data received') };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  },
};
