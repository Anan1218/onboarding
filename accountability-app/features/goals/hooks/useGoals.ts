import { useState, useEffect, useCallback } from 'react';
import { goalService } from '../services/goalService';
import type { Goal } from '../types/goal.types';

interface UseGoalsReturn {
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGoals(userId: string | undefined): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await goalService.getByUserId(userId);

    if (result.success) {
      setGoals(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  return { goals, isLoading, error, refetch: fetchGoals };
}

export function useActiveGoals(userId: string | undefined): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await goalService.getActiveByUserId(userId);

    if (result.success) {
      setGoals(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  return { goals, isLoading, error, refetch: fetchGoals };
}
