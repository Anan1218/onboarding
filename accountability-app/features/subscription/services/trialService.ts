import { supabase } from '@/shared/lib/supabase';
import type { Result } from '@/shared/types/common.types';
import type { DbUserSubscription } from '@/shared/types/database.types';

// Trial duration in days
const TRIAL_DURATION_DAYS = 7;

interface TrialStatus {
  isEligible: boolean;
  isActive: boolean;
  daysRemaining: number | null;
  endsAt: Date | null;
}

// Type guard for subscription data
function isValidDbSubscription(data: unknown): data is DbUserSubscription {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'has_used_trial' in data &&
    typeof data.has_used_trial === 'boolean'
  );
}

export const trialService = {
  async getTrialStatus(userId: string): Promise<Result<TrialStatus>> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error !== null) {
      // No subscription record - eligible for trial
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            isEligible: true,
            isActive: false,
            daysRemaining: null,
            endsAt: null,
          },
        };
      }
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbSubscription(data)) {
      return { success: false, error: new Error('Invalid subscription data') };
    }

    // Check if already used trial
    if (data.has_used_trial) {
      // Check if trial is still active
      if (data.trial_ends_at !== null) {
        const endsAt = new Date(data.trial_ends_at);
        const now = new Date();

        if (endsAt > now) {
          const daysRemaining = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            success: true,
            data: {
              isEligible: false,
              isActive: true,
              daysRemaining,
              endsAt,
            },
          };
        }
      }

      // Trial already used and expired
      return {
        success: true,
        data: {
          isEligible: false,
          isActive: false,
          daysRemaining: null,
          endsAt: null,
        },
      };
    }

    // Eligible for trial
    return {
      success: true,
      data: {
        isEligible: true,
        isActive: false,
        daysRemaining: null,
        endsAt: null,
      },
    };
  },

  async startTrial(userId: string): Promise<Result<TrialStatus>> {
    // Check eligibility first
    const statusResult = await this.getTrialStatus(userId);
    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }

    if (!statusResult.data.isEligible) {
      return { success: false, error: new Error('Trial already used') };
    }

    // Calculate trial end date
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

    // Upsert subscription with trial info
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier: 'premium',
        has_used_trial: true,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        started_at: now.toISOString(),
        expires_at: trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbSubscription(data)) {
      return { success: false, error: new Error('Invalid subscription data received') };
    }

    return {
      success: true,
      data: {
        isEligible: false,
        isActive: true,
        daysRemaining: TRIAL_DURATION_DAYS,
        endsAt: trialEndsAt,
      },
    };
  },

  async checkAndExpireTrials(): Promise<void> {
    // This would typically be called by a cron job
    // For now, it's a utility function that can be called manually
    const now = new Date().toISOString();

    await supabase
      .from('user_subscriptions')
      .update({
        tier: 'free',
      })
      .lt('trial_ends_at', now)
      .eq('tier', 'premium')
      .is('original_transaction_id', null); // Only expire trials, not paid subscriptions
  },
};
