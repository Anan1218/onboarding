// This file will be auto-generated later using Supabase CLI
// For now, define manually and update as we add tables

export type GoalStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      goal_status: GoalStatus;
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
