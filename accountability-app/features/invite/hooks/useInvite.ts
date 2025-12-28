import { useState, useCallback, useEffect } from 'react';
import { inviteService } from '../services/inviteService';
import type { Result } from '@/shared/types/common.types';

interface UseInviteReturn {
  inviteCode: string | null;
  isLoading: boolean;
  error: Error | null;
  createInvite: (goalId: string) => Promise<Result<string>>;
  loadExistingCode: (goalId: string) => Promise<void>;
}

export function useInvite(): UseInviteReturn {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadExistingCode = useCallback(async (goalId: string): Promise<void> => {
    const result = await inviteService.getExistingInviteCode(goalId);
    if (result.success && result.data !== null) {
      setInviteCode(result.data);
    }
  }, []);

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

  return { inviteCode, isLoading, error, createInvite, loadExistingCode };
}

interface UseParticipantsReturn {
  participants: ParticipantWithProfile[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

interface ParticipantWithProfile {
  id: string;
  goalId: string;
  userId: string;
  role: 'owner' | 'partner';
  username: string | null;
  joinedAt: Date | null;
}

export function useParticipants(goalId: string | undefined): UseParticipantsReturn {
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadParticipants = useCallback(async (): Promise<void> => {
    if (goalId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await inviteService.getParticipants(goalId);

    if (result.success) {
      // For now, just map without fetching profiles
      // Profile fetching will be done in the component or enhanced later
      const mapped = result.data.map((p) => ({
        id: p.id,
        goalId: p.goalId,
        userId: p.userId,
        role: p.role,
        username: null,
        joinedAt: p.joinedAt,
      }));
      setParticipants(mapped);
    }

    setIsLoading(false);
  }, [goalId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  return { participants, isLoading, refresh: loadParticipants };
}
