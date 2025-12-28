import { useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ProofSubscriptionPayload {
  id: string;
  goal_id: string;
  verification_status: string;
}

function isValidPayload(payload: unknown): payload is ProofSubscriptionPayload {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  return (
    'id' in payload &&
    typeof payload.id === 'string' &&
    'goal_id' in payload &&
    typeof payload.goal_id === 'string' &&
    'verification_status' in payload &&
    typeof payload.verification_status === 'string'
  );
}

interface UseProofSubscriptionOptions {
  goalId: string;
  onVerificationComplete: () => void;
}

export function useProofSubscription({
  goalId,
  onVerificationComplete,
}: UseProofSubscriptionOptions): void {
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType !== 'UPDATE') {
        return;
      }

      const newRecord = payload.new;
      if (!isValidPayload(newRecord)) {
        return;
      }

      // Only trigger for this goal's proofs that have been verified/rejected
      if (
        newRecord.goal_id === goalId &&
        (newRecord.verification_status === 'verified' ||
          newRecord.verification_status === 'rejected')
      ) {
        onVerificationComplete();
      }
    },
    [goalId, onVerificationComplete]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`proof-updates-${goalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proof_submissions',
          filter: `goal_id=eq.${goalId}`,
        },
        handleChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [goalId, handleChange]);
}
