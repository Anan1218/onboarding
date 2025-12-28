import { useState, useEffect, useCallback } from 'react';
import { trialService } from '../services/trialService';
import { useAuth } from '@/features/auth';
import type { Result } from '@/shared/types/common.types';

interface TrialStatus {
  isEligible: boolean;
  isActive: boolean;
  daysRemaining: number | null;
  endsAt: Date | null;
}

interface UseTrialReturn {
  trialStatus: TrialStatus | null;
  isLoading: boolean;
  error: Error | null;
  startTrial: () => Promise<Result<TrialStatus>>;
  refresh: () => Promise<void>;
}

export function useTrial(): UseTrialReturn {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStatus = useCallback(async (): Promise<void> => {
    if (user === null) {
      setTrialStatus(null);
      setIsLoading(false);
      return;
    }

    const result = await trialService.getTrialStatus(user.id);
    if (result.success) {
      setTrialStatus(result.data);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startTrial = useCallback(async (): Promise<Result<TrialStatus>> => {
    if (user === null) {
      return { success: false, error: new Error('Not authenticated') };
    }

    setIsLoading(true);
    setError(null);

    const result = await trialService.startTrial(user.id);
    if (result.success) {
      setTrialStatus(result.data);
    } else {
      setError(result.error);
    }
    setIsLoading(false);

    return result;
  }, [user]);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await loadStatus();
  }, [loadStatus]);

  return {
    trialStatus,
    isLoading,
    error,
    startTrial,
    refresh,
  };
}
