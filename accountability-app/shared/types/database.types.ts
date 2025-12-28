// This file will be auto-generated later using Supabase CLI
// For now, define manually and update as we add tables

export type GoalStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
export type ParticipantRole = 'owner' | 'partner';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type SubscriptionTier = 'free' | 'premium';

export interface VerificationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  checkedAt: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          venmo_handle: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          venmo_handle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string | null;
          venmo_handle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          deadline: string;
          status: GoalStatus;
          stake_amount_cents: number;
          subscription_id: string | null;
          subscription_product_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          deadline: string;
          status?: GoalStatus;
          stake_amount_cents?: number;
          subscription_id?: string | null;
          subscription_product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          deadline?: string;
          status?: GoalStatus;
          stake_amount_cents?: number;
          subscription_id?: string | null;
          subscription_product_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goal_participants: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          role: ParticipantRole;
          invite_code: string | null;
          invited_at: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          role?: ParticipantRole;
          invite_code?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          role?: ParticipantRole;
          invite_code?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      proof_submissions: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          image_path: string;
          image_url: string | null;
          verification_status: VerificationStatus;
          verification_result: VerificationResult | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          image_path: string;
          image_url?: string | null;
          verification_status?: VerificationStatus;
          verification_result?: VerificationResult | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          image_path?: string;
          image_url?: string | null;
          verification_status?: VerificationStatus;
          verification_result?: VerificationResult | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: SubscriptionTier;
          product_id: string | null;
          original_transaction_id: string | null;
          latest_receipt: string | null;
          started_at: string | null;
          expires_at: string | null;
          cancelled_at: string | null;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          has_used_trial: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: SubscriptionTier;
          product_id?: string | null;
          original_transaction_id?: string | null;
          latest_receipt?: string | null;
          started_at?: string | null;
          expires_at?: string | null;
          cancelled_at?: string | null;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          has_used_trial?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: SubscriptionTier;
          product_id?: string | null;
          original_transaction_id?: string | null;
          latest_receipt?: string | null;
          started_at?: string | null;
          expires_at?: string | null;
          cancelled_at?: string | null;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          has_used_trial?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      goal_status: GoalStatus;
      participant_role: ParticipantRole;
      verification_status: VerificationStatus;
      subscription_tier: SubscriptionTier;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type ProfileInsert = InsertTables<'profiles'>;
export type ProfileUpdate = UpdateTables<'profiles'>;

export type DbGoal = Tables<'goals'>;
export type DbGoalInsert = InsertTables<'goals'>;
export type DbGoalUpdate = UpdateTables<'goals'>;

export type DbGoalParticipant = Tables<'goal_participants'>;
export type DbGoalParticipantInsert = InsertTables<'goal_participants'>;
export type DbGoalParticipantUpdate = UpdateTables<'goal_participants'>;

export type DbProofSubmission = Tables<'proof_submissions'>;
export type DbProofSubmissionInsert = InsertTables<'proof_submissions'>;
export type DbProofSubmissionUpdate = UpdateTables<'proof_submissions'>;

export type DbUserSubscription = Tables<'user_subscriptions'>;
export type DbUserSubscriptionInsert = InsertTables<'user_subscriptions'>;
export type DbUserSubscriptionUpdate = UpdateTables<'user_subscriptions'>;
