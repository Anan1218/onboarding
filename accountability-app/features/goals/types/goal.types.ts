import type { GoalStatus, DbGoal } from '@/shared/types/database.types';

export type { GoalStatus };

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  stakeAmountCents: number;
  subscriptionId: string | null;
  subscriptionProductId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalInput {
  title: string;
  description: string;
  deadline: Date;
  stakeAmountCents: number;
}

export interface GoalFormData {
  title: string;
  description: string;
  deadlineDays: number; // Days from now
  stakeAmountCents: number;
}

// Map database row to domain model
export function mapDbGoalToGoal(dbGoal: DbGoal): Goal {
  return {
    id: dbGoal.id,
    userId: dbGoal.user_id,
    title: dbGoal.title,
    description: dbGoal.description,
    deadline: new Date(dbGoal.deadline),
    status: dbGoal.status,
    stakeAmountCents: dbGoal.stake_amount_cents,
    subscriptionId: dbGoal.subscription_id,
    subscriptionProductId: dbGoal.subscription_product_id,
    createdAt: new Date(dbGoal.created_at),
    updatedAt: new Date(dbGoal.updated_at),
  };
}
