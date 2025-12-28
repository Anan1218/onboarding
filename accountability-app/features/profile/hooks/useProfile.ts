import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profileService';
import type { Profile, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

interface UseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (data: ProfileUpdate) => Promise<Result<Profile>>;
  refetch: () => Promise<void>;
}

export function useProfile(userId: string | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await profileService.getByUserId(userId);

    if (result.success) {
      if (result.data === null) {
        // Profile doesn't exist - create it
        const createResult = await profileService.create({ user_id: userId });
        if (createResult.success) {
          setProfile(createResult.data);
        } else {
          setError(createResult.error);
        }
      } else {
        setProfile(result.data);
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: ProfileUpdate): Promise<Result<Profile>> => {
      if (userId === undefined) {
        return { success: false, error: new Error('User ID is undefined') };
      }

      const result = await profileService.update(userId, data);

      if (result.success) {
        setProfile(result.data);
      }

      return result;
    },
    [userId]
  );

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
