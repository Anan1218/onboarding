# Phase 5: Create a Goal (Solo)

**Goal:** User can create a goal and see it on dashboard
**Test:** Fill form → submit → see goal appear in list

---

## Prerequisites

- Phase 4 completed
- User has profile

---

## Step 1: Create Goals Table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- supabase/migrations/00002_create_goals.sql

-- Goal status enum
CREATE TYPE goal_status AS ENUM ('pending', 'active', 'completed', 'failed', 'cancelled');

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Timing
  deadline TIMESTAMPTZ NOT NULL,

  -- Status
  status goal_status NOT NULL DEFAULT 'active',

  -- Stake (in cents to avoid floating point issues)
  stake_amount_cents INTEGER NOT NULL DEFAULT 0,

  -- Subscription (filled in Phase 10)
  subscription_id TEXT,
  subscription_product_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX goals_user_id_idx ON goals(user_id);
CREATE INDEX goals_status_idx ON goals(status);
CREATE INDEX goals_deadline_idx ON goals(deadline);
```

---

## Step 2: Update Database Types

```typescript
// shared/types/database.types.ts
// Add to existing file:

export type GoalStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        // ... existing profile types
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
      };
    };
    // ... rest of types
  };
}

export type Goal = Tables<'goals'>;
export type GoalInsert = InsertTables<'goals'>;
export type GoalUpdate = UpdateTables<'goals'>;
```

---

## Step 3: Create Goal Types

```typescript
// features/goals/types/goal.types.ts
import type { GoalStatus } from '@/shared/types/database.types';

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
export function mapDbGoalToGoal(dbGoal: {
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
}): Goal {
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
    updatedAt: new Date(dbGoal.updated_at)
  };
}
```

---

## Step 4: Create Goal Service

```typescript
// features/goals/services/goalService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Goal, CreateGoalInput } from '../types/goal.types';
import { mapDbGoalToGoal } from '../types/goal.types';
import type { GoalStatus } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

export const goalService = {
  async getByUserId(userId: string): Promise<Result<Goal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    const goals = data.map(mapDbGoalToGoal);
    return { success: true, data: goals };
  },

  async getActiveByUserId(userId: string): Promise<Result<Goal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'active'])
      .order('deadline', { ascending: true });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    const goals = data.map(mapDbGoalToGoal);
    return { success: true, data: goals };
  },

  async getById(goalId: string): Promise<Result<Goal | null>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data === null) {
      return { success: true, data: null };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  },

  async create(userId: string, input: CreateGoalInput): Promise<Result<Goal>> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        deadline: input.deadline.toISOString(),
        stake_amount_cents: input.stakeAmountCents,
        status: 'active'
      })
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  },

  async updateStatus(goalId: string, status: GoalStatus): Promise<Result<Goal>> {
    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: mapDbGoalToGoal(data) };
  }
};
```

---

## Step 5: Create Goal Hooks

```typescript
// features/goals/hooks/useGoals.ts
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
```

```typescript
// features/goals/hooks/useGoal.ts
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
```

---

## Step 6: Create Goal Form Component

```typescript
// features/goals/components/GoalForm.tsx
import { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { goalService } from '../services/goalService';
import type { GoalFormData } from '../types/goal.types';

interface FormErrors {
  title?: string;
  description?: string;
  deadline?: string;
}

const DEADLINE_OPTIONS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 }
];

// Stake options will be replaced with real products in Phase 9
const STAKE_OPTIONS = [
  { label: 'Free', cents: 0 },
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$20', cents: 2000 },
  { label: '$50', cents: 5000 }
];

export function GoalForm(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    deadlineDays: 7,
    stakeAmountCents: 0
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (formData.title.trim().length === 0) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (formData.description.trim().length === 0) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    if (!validate()) {
      return;
    }

    if (user === null) {
      Alert.alert('Error', 'You must be logged in to create a goal');
      return;
    }

    setIsLoading(true);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + formData.deadlineDays);

    const result = await goalService.create(user.id, {
      title: formData.title.trim(),
      description: formData.description.trim(),
      deadline,
      stakeAmountCents: formData.stakeAmountCents
    });

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', 'Failed to create goal');
      return;
    }

    Alert.alert('Success', 'Goal created!', [
      { text: 'OK', onPress: (): void => router.replace('/(tabs)') }
    ]);
  }

  function updateFormData(updates: Partial<GoalFormData>): void {
    setFormData(prev => ({ ...prev, ...updates }));
  }

  return (
    <View className="w-full gap-6">
      {/* Title */}
      <Input
        label="Goal Title"
        value={formData.title}
        onChangeText={(title): void => updateFormData({ title })}
        placeholder="e.g., Go to the gym"
        error={errors.title}
      />

      {/* Description - what the AI should look for */}
      <View>
        <Input
          label="What should the photo show?"
          value={formData.description}
          onChangeText={(description): void => updateFormData({ description })}
          placeholder="e.g., Me at the gym with exercise equipment visible"
          error={errors.description}
        />
        <Text className="text-xs text-gray-500 mt-1">
          Describe what the AI should look for to verify your goal
        </Text>
      </View>

      {/* Deadline */}
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Deadline</Text>
        <View className="flex-row flex-wrap gap-2">
          {DEADLINE_OPTIONS.map(option => (
            <Pressable
              key={option.days}
              onPress={(): void => updateFormData({ deadlineDays: option.days })}
              className={`px-4 py-2 rounded-lg border ${
                formData.deadlineDays === option.days
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={
                  formData.deadlineDays === option.days
                    ? 'text-white font-medium'
                    : 'text-gray-700'
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stake Amount */}
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Stake Amount</Text>
        <Text className="text-xs text-gray-500 mb-2">
          If you don't complete your goal, you'll be charged this amount
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STAKE_OPTIONS.map(option => (
            <Pressable
              key={option.cents}
              onPress={(): void => updateFormData({ stakeAmountCents: option.cents })}
              className={`px-4 py-2 rounded-lg border ${
                formData.stakeAmountCents === option.cents
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={
                  formData.stakeAmountCents === option.cents
                    ? 'text-white font-medium'
                    : 'text-gray-700'
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Submit */}
      <View className="mt-4">
        <Button
          title="Create Goal"
          onPress={(): void => void handleSubmit()}
          loading={isLoading}
        />
      </View>
    </View>
  );
}
```

---

## Step 7: Create Goal Card Component

```typescript
// features/goals/components/GoalCard.tsx
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Goal } from '../types/goal.types';
import { formatRelativeDate, formatCurrency } from '@/shared/utils/formatters';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps): JSX.Element {
  const router = useRouter();

  function handlePress(): void {
    router.push(`/goal/${goal.id}`);
  }

  const isOverdue = goal.deadline < new Date() && goal.status === 'active';
  const deadlineColor = isOverdue ? 'text-red-600' : 'text-gray-600';

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1" numberOfLines={1}>
          {goal.title}
        </Text>
        <StatusBadge status={goal.status} />
      </View>

      <Text className="text-gray-600 mb-3" numberOfLines={2}>
        {goal.description}
      </Text>

      <View className="flex-row justify-between items-center">
        <Text className={`text-sm ${deadlineColor}`}>
          {isOverdue ? 'Overdue: ' : 'Due: '}
          {formatRelativeDate(goal.deadline)}
        </Text>
        {goal.stakeAmountCents > 0 && (
          <Text className="text-sm font-medium text-primary-600">
            {formatCurrency(goal.stakeAmountCents)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

interface StatusBadgeProps {
  status: Goal['status'];
}

function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = getStatusConfig(status);

  return (
    <View className={`px-2 py-1 rounded-full ${config.bgColor}`}>
      <Text className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

function getStatusConfig(status: Goal['status']): StatusConfig {
  switch (status) {
    case 'pending':
      return { label: 'Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    case 'active':
      return { label: 'Active', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    case 'completed':
      return { label: 'Completed', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    case 'failed':
      return { label: 'Failed', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    case 'cancelled':
      return { label: 'Cancelled', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unknown status: ${String(_exhaustive)}`);
    }
  }
}
```

---

## Step 8: Create Goal List Component

```typescript
// features/goals/components/GoalList.tsx
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { GoalCard } from './GoalCard';
import type { Goal } from '../types/goal.types';

interface GoalListProps {
  goals: Goal[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  emptyMessage?: string;
}

export function GoalList({
  goals,
  isLoading,
  onRefresh,
  emptyMessage = 'No goals yet'
}: GoalListProps): JSX.Element {
  if (goals.length === 0 && !isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-gray-500 text-center">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={goals}
      keyExtractor={(item): string => item.id}
      renderItem={({ item }): JSX.Element => <GoalCard goal={item} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={(): void => void onRefresh()}
          tintColor="#0284c7"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
```

---

## Step 9: Create Formatter Utilities

```typescript
// shared/utils/formatters.ts
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    return date.toLocaleDateString();
  }

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 14) return 'next week';

  return date.toLocaleDateString();
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(dollars);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
```

---

## Step 10: Update Dashboard Screen

```typescript
// app/(tabs)/index.tsx
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '@/features/auth';
import { useActiveGoals } from '@/features/goals/hooks/useGoals';
import { GoalList } from '@/features/goals/components/GoalList';

export default function DashboardScreen(): JSX.Element {
  const { user } = useAuth();
  const { goals, isLoading, error, refetch } = useActiveGoals(user?.id);

  if (error !== null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center">{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Active Goals</Text>
          <Text className="text-gray-600 mt-1">
            {goals.length === 0
              ? 'Create your first goal to get started'
              : `${goals.length} active goal${goals.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {/* Goals List */}
        {isLoading && goals.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <GoalList
            goals={goals}
            isLoading={isLoading}
            onRefresh={refetch}
            emptyMessage="No active goals. Tap 'Create Goal' to get started!"
          />
        )}

        {/* Empty State CTA */}
        {goals.length === 0 && !isLoading && (
          <View className="p-4">
            <Link
              href="/(tabs)/create"
              className="bg-primary-600 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-semibold text-center text-lg">
                Create Your First Goal
              </Text>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

---

## Step 11: Update Create Screen

```typescript
// app/(tabs)/create.tsx
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoalForm } from '@/features/goals/components/GoalForm';

export default function CreateScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GoalForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

---

## Step 12: Create Goal Detail Screen

```typescript
// app/goal/[id].tsx
import { View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useGoal } from '@/features/goals/hooks/useGoal';
import { formatDate, formatCurrency } from '@/shared/utils/formatters';

export default function GoalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { goal, isLoading, error, updateStatus } = useGoal(id);

  async function handleCancel(): Promise<void> {
    Alert.alert(
      'Cancel Goal',
      'Are you sure you want to cancel this goal?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async (): Promise<void> => {
            const result = await updateStatus('cancelled');
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', 'Failed to cancel goal');
            }
          }
        }
      ]
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null || goal === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center">
            {error?.message ?? 'Goal not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = goal.status === 'active' || goal.status === 'pending';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: goal.title }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Title & Status */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</Text>
          <StatusBadge status={goal.status} />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-1">
            What the photo should show:
          </Text>
          <Text className="text-gray-900">{goal.description}</Text>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-6">
          <DetailRow label="Deadline" value={formatDate(goal.deadline)} />
          <DetailRow
            label="Stake"
            value={goal.stakeAmountCents > 0 ? formatCurrency(goal.stakeAmountCents) : 'Free'}
          />
          <DetailRow label="Created" value={formatDate(goal.createdAt)} />
        </View>

        {/* Proof Upload Section - Placeholder for Phase 7 */}
        {isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Submit Proof
            </Text>
            <View className="bg-gray-100 rounded-xl p-6 items-center">
              <Text className="text-gray-500 text-center">
                Photo upload coming in Phase 7
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {isActive && (
          <View className="mt-4">
            <Button
              title="Cancel Goal"
              onPress={(): void => void handleCancel()}
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    active: { bg: 'bg-blue-100', text: 'text-blue-800' },
    completed: { bg: 'bg-green-100', text: 'text-green-800' },
    failed: { bg: 'bg-red-100', text: 'text-red-800' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' }
  }[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <View className={`self-start px-3 py-1 rounded-full ${config.bg}`}>
      <Text className={`text-sm font-medium capitalize ${config.text}`}>
        {status}
      </Text>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps): JSX.Element {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  );
}
```

---

## Step 13: Export Goals Feature

```typescript
// features/goals/index.ts
export { goalService } from './services/goalService';
export { useGoals, useActiveGoals } from './hooks/useGoals';
export { useGoal } from './hooks/useGoal';
export { GoalForm } from './components/GoalForm';
export { GoalCard } from './components/GoalCard';
export { GoalList } from './components/GoalList';
export type { Goal, CreateGoalInput, GoalFormData, GoalStatus } from './types/goal.types';
export { mapDbGoalToGoal } from './types/goal.types';
```

---

## Verification Checklist

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. App starts without errors
npx expo start
```

### Manual Testing

1. **Dashboard empty state**: See "No active goals" message
2. **Navigate to Create**: Tap Create tab
3. **Fill form**: Enter title, description, select deadline and stake
4. **Create goal**: Tap "Create Goal", see success
5. **View on dashboard**: Goal appears in active goals list
6. **Tap goal**: Navigate to goal detail page
7. **View details**: See all goal info
8. **Cancel goal**: Tap cancel, confirm, goal disappears from dashboard
9. **Supabase check**: View goals table, see created data

---

## Files Created/Modified

```
accountability-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx           # MODIFIED
│   │   └── create.tsx          # MODIFIED
│   └── goal/
│       └── [id].tsx            # NEW
├── features/
│   └── goals/
│       ├── components/
│       │   ├── GoalForm.tsx    # NEW
│       │   ├── GoalCard.tsx    # NEW
│       │   └── GoalList.tsx    # NEW
│       ├── hooks/
│       │   ├── useGoals.ts     # NEW
│       │   └── useGoal.ts      # NEW
│       ├── services/
│       │   └── goalService.ts  # NEW
│       ├── types/
│       │   └── goal.types.ts   # NEW
│       └── index.ts            # NEW
├── shared/
│   ├── types/
│   │   └── database.types.ts   # MODIFIED
│   └── utils/
│       └── formatters.ts       # NEW
└── supabase/
    └── migrations/
        └── 00002_create_goals.sql # NEW
```

---

## Database State After Phase 5

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profile data | Enabled |
| goals | User goals with deadlines and stakes | Enabled |

---

## Next Phase

Proceed to [Phase 6: Accountability Partner](./phase-06-accountability-partner.md) to add invite links.
