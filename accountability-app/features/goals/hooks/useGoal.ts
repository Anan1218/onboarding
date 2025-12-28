import { useState, useEffect, useCallback } from 'react';
import { goalService } from '../services/goalService';
import type { Goal } from '../types/goal.types';
import type { GoalStatus } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

interface UseGoalReturn {
  goal: Goal | null;
  isLoading: boolean;
  error: Error | null;
  updateStatus: (status: GoalStatus) => Promise<Result<Goal>>;
  refetch: () => Promise<void>;
}

export function useGoal(goalId: string | undefined): UseGoalReturn {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoal = useCallback(async (): Promise<void> => {
    if (goalId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await goalService.getById(goalId);

    if (result.success) {
      setGoal(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [goalId]);

  useEffect(() => {
    void fetchGoal();
  }, [fetchGoal]);

  const updateStatus = useCallback(
    async (status: GoalStatus): Promise<Result<Goal>> => {
      if (goalId === undefined) {
        return { success: false, error: new Error('Goal ID is undefined') };
      }

      const result = await goalService.updateStatus(goalId, status);

      if (result.success) {
        setGoal(result.data);
      }

      return result;
    },
    [goalId]
  );

  return { goal, isLoading, error, updateStatus, refetch: fetchGoal };
}
