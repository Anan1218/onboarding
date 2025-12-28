import { supabase } from '@/shared/lib/supabase';
import type { Profile, ProfileInsert, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

function isValidProfile(data: unknown): data is Profile {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'username' in data &&
    (data.username === null || typeof data.username === 'string') &&
    'venmo_handle' in data &&
    (data.venmo_handle === null || typeof data.venmo_handle === 'string') &&
    'created_at' in data &&
    typeof data.created_at === 'string' &&
    'updated_at' in data &&
    typeof data.updated_at === 'string'
  );
}

export const profileService = {
  async getByUserId(userId: string): Promise<Result<Profile | null>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, username, venmo_handle, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data === null) {
      return { success: true, data: null };
    }

    if (!isValidProfile(data)) {
      return { success: false, error: new Error('Invalid profile data received') };
    }

    return { success: true, data };
  },

  async create(input: ProfileInsert): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(input)
      .select('id, user_id, username, venmo_handle, created_at, updated_at')
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidProfile(data)) {
      return { success: false, error: new Error('Invalid profile data received') };
    }

    return { success: true, data };
  },

  async update(userId: string, input: ProfileUpdate): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .update(input)
      .eq('user_id', userId)
      .select('id, user_id, username, venmo_handle, created_at, updated_at')
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidProfile(data)) {
      return { success: false, error: new Error('Invalid profile data received') };
    }

    return { success: true, data };
  },
};
