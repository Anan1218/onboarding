import { useState, useCallback } from 'react';
import { googleAuthService } from '../services/googleAuthService';
import type { Result } from '@/shared/types/common.types';
import type { Session } from '@supabase/supabase-js';

interface UseGoogleAuthReturn {
  isLoading: boolean;
  error: Error | null;
  signIn: () => Promise<Result<Session>>;
  signOut: () => Promise<Result<void>>;
  clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signIn = useCallback(async (): Promise<Result<Session>> => {
    setIsLoading(true);
    setError(null);

    const result = await googleAuthService.signIn();

    if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
    return result;
  }, []);

  const signOut = useCallback(async (): Promise<Result<void>> => {
    setIsLoading(true);
    setError(null);

    const result = await googleAuthService.signOut();

    if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
    return result;
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    signIn,
    signOut,
    clearError,
  };
}
