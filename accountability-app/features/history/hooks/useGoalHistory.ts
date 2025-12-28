import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Goal } from '@/features/goals';
import { mapDbGoalToGoal } from '@/features/goals';
import type { DbGoal, GoalStatus } from '@/shared/types/database.types';

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
    'status' in data &&
    typeof data.status === 'string'
  );
}

function isValidDbGoalArray(data: unknown): data is DbGoal[] {
  return Array.isArray(data) && data.every(isValidDbGoal);
}

type HistoryFilter = 'all' | GoalStatus;

interface UseGoalHistoryReturn {
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
  filter: HistoryFilter;
  setFilter: (filter: HistoryFilter) => void;
  refetch: () => Promise<void>;
  stats: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export function useGoalHistory(userId: string | undefined): UseGoalHistoryReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const fetchGoals = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setGoals([]);
      setAllGoals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch completed, failed, and cancelled goals
    const { data, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'cancelled'])
      .order('updated_at', { ascending: false });

    if (fetchError !== null) {
      setError(new Error(fetchError.message));
      setIsLoading(false);
      return;
    }

    if (!isValidDbGoalArray(data)) {
      setError(new Error('Invalid data received'));
      setIsLoading(false);
      return;
    }

    const mappedGoals = data.map(mapDbGoalToGoal);
    setAllGoals(mappedGoals);
    setGoals(mappedGoals);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  // Apply filter
  useEffect(() => {
    if (filter === 'all') {
      setGoals(allGoals);
    } else {
      setGoals(allGoals.filter((g) => g.status === filter));
    }
  }, [filter, allGoals]);

  const stats = {
    total: allGoals.length,
    completed: allGoals.filter((g) => g.status === 'completed').length,
    failed: allGoals.filter((g) => g.status === 'failed').length,
    cancelled: allGoals.filter((g) => g.status === 'cancelled').length,
  };

  return {
    goals,
    isLoading,
    error,
    filter,
    setFilter,
    refetch: fetchGoals,
    stats,
  };
}
