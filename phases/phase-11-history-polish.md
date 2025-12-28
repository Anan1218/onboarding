# Phase 11: History & Polish

**Goal:** See past goals and outcomes
**Test:** Complete a goal → see it in history

---

## Prerequisites

- Phase 10 completed
- Goals can be created, completed, and failed

---

## Step 1: Create History Types

```typescript
// features/history/types/history.types.ts
import type { Goal, GoalStatus } from '@/features/goals';

export interface HistoryGoal extends Goal {
  outcome: GoalOutcome;
  chargedAmount: number | null;
}

export type GoalOutcome = 'completed' | 'failed' | 'cancelled';

export interface HistoryStats {
  totalGoals: number;
  completed: number;
  failed: number;
  cancelled: number;
  completionRate: number;
  totalStaked: number;
  totalCharged: number;
}

export function getGoalOutcome(status: GoalStatus): GoalOutcome {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      throw new Error(`Cannot get outcome for active status: ${status}`);
  }
}
```

---

## Step 2: Create History Service

```typescript
// features/history/services/historyService.ts
import { supabase } from '@/shared/lib/supabase';
import type { HistoryGoal, HistoryStats } from '../types/history.types';
import { getGoalOutcome } from '../types/history.types';
import { mapDbGoalToGoal } from '@/features/goals';
import type { Result } from '@/shared/types/common.types';

export const historyService = {
  async getCompletedGoals(userId: string): Promise<Result<HistoryGoal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'cancelled'])
      .order('updated_at', { ascending: false });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    const historyGoals: HistoryGoal[] = data.map((dbGoal) => {
      const goal = mapDbGoalToGoal(dbGoal);
      const outcome = getGoalOutcome(goal.status);

      return {
        ...goal,
        outcome,
        chargedAmount: outcome === 'failed' ? goal.stakeAmountCents : null
      };
    });

    return { success: true, data: historyGoals };
  },

  async getStats(userId: string): Promise<Result<HistoryStats>> {
    const { data, error } = await supabase
      .from('goals')
      .select('status, stake_amount_cents')
      .eq('user_id', userId)
      .in('status', ['completed', 'failed', 'cancelled']);

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    const completed = data.filter((g) => g.status === 'completed').length;
    const failed = data.filter((g) => g.status === 'failed').length;
    const cancelled = data.filter((g) => g.status === 'cancelled').length;
    const totalGoals = completed + failed + cancelled;

    const totalStaked = data.reduce((sum, g) => sum + (g.stake_amount_cents ?? 0), 0);
    const totalCharged = data
      .filter((g) => g.status === 'failed')
      .reduce((sum, g) => sum + (g.stake_amount_cents ?? 0), 0);

    const completionRate = totalGoals > 0
      ? Math.round((completed / (completed + failed)) * 100)
      : 0;

    return {
      success: true,
      data: {
        totalGoals,
        completed,
        failed,
        cancelled,
        completionRate,
        totalStaked,
        totalCharged
      }
    };
  }
};
```

---

## Step 3: Create History Hook

```typescript
// features/history/hooks/useHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { historyService } from '../services/historyService';
import type { HistoryGoal, HistoryStats } from '../types/history.types';

interface UseHistoryReturn {
  goals: HistoryGoal[];
  stats: HistoryStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHistory(userId: string | undefined): UseHistoryReturn {
  const [goals, setGoals] = useState<HistoryGoal[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [goalsResult, statsResult] = await Promise.all([
      historyService.getCompletedGoals(userId),
      historyService.getStats(userId)
    ]);

    if (goalsResult.success) {
      setGoals(goalsResult.data);
    } else {
      setError(goalsResult.error);
    }

    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { goals, stats, isLoading, error, refetch: fetchHistory };
}
```

---

## Step 4: Create History Stats Component

```typescript
// features/history/components/HistoryStats.tsx
import { View, Text } from 'react-native';
import type { HistoryStats as HistoryStatsType } from '../types/history.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface HistoryStatsProps {
  stats: HistoryStatsType;
}

export function HistoryStats({ stats }: HistoryStatsProps): JSX.Element {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      {/* Completion Rate */}
      <View className="items-center mb-4">
        <Text className="text-4xl font-bold text-primary-600">
          {stats.completionRate}%
        </Text>
        <Text className="text-gray-500">Completion Rate</Text>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap">
        <StatBox
          label="Completed"
          value={stats.completed.toString()}
          color="text-green-600"
        />
        <StatBox
          label="Failed"
          value={stats.failed.toString()}
          color="text-red-600"
        />
        <StatBox
          label="Total Staked"
          value={formatCurrency(stats.totalStaked)}
          color="text-gray-900"
        />
        <StatBox
          label="Charged"
          value={formatCurrency(stats.totalCharged)}
          color="text-red-600"
        />
      </View>
    </View>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps): JSX.Element {
  return (
    <View className="w-1/2 p-2">
      <View className="bg-gray-50 rounded-lg p-3 items-center">
        <Text className={`text-xl font-bold ${color}`}>{value}</Text>
        <Text className="text-xs text-gray-500">{label}</Text>
      </View>
    </View>
  );
}
```

---

## Step 5: Create History Card Component

```typescript
// features/history/components/HistoryCard.tsx
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { HistoryGoal } from '../types/history.types';
import { formatDate, formatCurrency } from '@/shared/utils/formatters';

interface HistoryCardProps {
  goal: HistoryGoal;
}

export function HistoryCard({ goal }: HistoryCardProps): JSX.Element {
  const router = useRouter();
  const outcomeConfig = getOutcomeConfig(goal.outcome);

  function handlePress(): void {
    router.push(`/goal/${goal.id}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1" numberOfLines={1}>
          {goal.title}
        </Text>
        <View className={`px-2 py-1 rounded-full ${outcomeConfig.bg}`}>
          <Text className={`text-xs font-medium ${outcomeConfig.text}`}>
            {outcomeConfig.label}
          </Text>
        </View>
      </View>

      <Text className="text-gray-600 mb-3" numberOfLines={1}>
        {goal.description}
      </Text>

      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-500">
          {formatDate(goal.updatedAt)}
        </Text>
        {goal.stakeAmountCents > 0 && (
          <View className="flex-row items-center gap-1">
            <Text className="text-sm text-gray-500">
              Stake: {formatCurrency(goal.stakeAmountCents)}
            </Text>
            {goal.chargedAmount !== null && (
              <Text className="text-sm text-red-600 font-medium">
                (Charged)
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface OutcomeConfig {
  label: string;
  bg: string;
  text: string;
}

function getOutcomeConfig(outcome: HistoryGoal['outcome']): OutcomeConfig {
  switch (outcome) {
    case 'completed':
      return { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800' };
    case 'failed':
      return { label: 'Failed', bg: 'bg-red-100', text: 'text-red-800' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-800' };
    default: {
      const _exhaustive: never = outcome;
      throw new Error(`Unknown outcome: ${String(_exhaustive)}`);
    }
  }
}
```

---

## Step 6: Create History List Component

```typescript
// features/history/components/HistoryList.tsx
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { HistoryCard } from './HistoryCard';
import { HistoryStats } from './HistoryStats';
import type { HistoryGoal, HistoryStats as HistoryStatsType } from '../types/history.types';

interface HistoryListProps {
  goals: HistoryGoal[];
  stats: HistoryStatsType | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function HistoryList({
  goals,
  stats,
  isLoading,
  onRefresh
}: HistoryListProps): JSX.Element {
  function renderHeader(): JSX.Element | null {
    if (stats === null) return null;

    return (
      <View className="mb-4">
        <HistoryStats stats={stats} />
      </View>
    );
  }

  if (goals.length === 0 && !isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-gray-500 text-center">
          No completed goals yet.{'\n'}Complete your first goal to see it here!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={goals}
      keyExtractor={(item): string => item.id}
      renderItem={({ item }): JSX.Element => <HistoryCard goal={item} />}
      ListHeaderComponent={renderHeader}
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

## Step 7: Update History Screen

```typescript
// app/(tabs)/history.tsx
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth';
import { useHistory } from '@/features/history/hooks/useHistory';
import { HistoryList } from '@/features/history/components/HistoryList';

export default function HistoryScreen(): JSX.Element {
  const { user } = useAuth();
  const { goals, stats, isLoading, error, refetch } = useHistory(user?.id);

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
          <Text className="text-2xl font-bold text-gray-900">History</Text>
          <Text className="text-gray-600 mt-1">
            Your past goals and outcomes
          </Text>
        </View>

        {/* Content */}
        {isLoading && goals.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <HistoryList
            goals={goals}
            stats={stats}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
```

---

## Step 8: Export History Feature

```typescript
// features/history/index.ts
export { historyService } from './services/historyService';
export { useHistory } from './hooks/useHistory';
export { HistoryStats } from './components/HistoryStats';
export { HistoryCard } from './components/HistoryCard';
export { HistoryList } from './components/HistoryList';
export type { HistoryGoal, HistoryStats as HistoryStatsType, GoalOutcome } from './types/history.types';
```

---

## Step 9: Add Polish - Loading Skeletons

```typescript
// shared/components/Skeleton.tsx
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4
}: SkeletonProps): JSX.Element {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB'
        }
      ]}
    />
  );
}

export function GoalCardSkeleton(): JSX.Element {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <Skeleton width="70%" height={24} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <Skeleton width="90%" height={16} />
      <View className="mt-3 flex-row justify-between">
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </View>
    </View>
  );
}
```

---

## Step 10: Add Polish - Empty States

```typescript
// shared/components/EmptyState.tsx
import { View, Text, Pressable } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps): JSX.Element {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
        {title}
      </Text>
      <Text className="text-gray-500 text-center mb-6">{description}</Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <Pressable
          onPress={onAction}
          className="bg-primary-600 px-6 py-3 rounded-lg active:bg-primary-700"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
```

---

## Step 11: Add Polish - Tab Bar Icons

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps): JSX.Element {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? '#0284c7' : '#9CA3AF'}
    />
  );
}

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon name={focused ? 'add-circle' : 'add-circle-outline'} focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          )
        }}
      />
    </Tabs>
  );
}
```

Install icons:

```bash
npx expo install @expo/vector-icons
```

---

## Step 12: Add Polish - Pull to Refresh Everywhere

Already implemented in History and Dashboard. Verify all lists support pull-to-refresh.

---

## Step 13: Final Type Check and Lint

```bash
# Run full validation
npm run typecheck
npm run lint
npm run lint:fix

# Fix any remaining issues
```

---

## Verification Checklist

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. All tests pass (if any)
npm run test

# 4. App builds successfully
npx expo start
```

### Manual Testing - Complete Flow

1. **Create free goal**: No stake, complete it via proof
2. **View in history**: See completed goal with stats
3. **Create staked goal**: $5 stake
4. **Complete staked goal**: Upload proof, get verified
5. **View in history**: See completed, no charge shown
6. **Create another staked goal**: Let it fail (or cancel)
7. **View in history**: See failed/cancelled goal
8. **Check stats**: Completion rate updates correctly
9. **Pull to refresh**: Works on all screens
10. **Tab icons**: Show correctly with active states

---

## Files Created/Modified

```
accountability-app/
├── app/
│   └── (tabs)/
│       ├── _layout.tsx           # MODIFIED (icons)
│       └── history.tsx           # MODIFIED
├── features/
│   └── history/
│       ├── components/
│       │   ├── HistoryStats.tsx  # NEW
│       │   ├── HistoryCard.tsx   # NEW
│       │   └── HistoryList.tsx   # NEW
│       ├── hooks/
│       │   └── useHistory.ts     # NEW
│       ├── services/
│       │   └── historyService.ts # NEW
│       ├── types/
│       │   └── history.types.ts  # NEW
│       └── index.ts              # NEW
└── shared/
    └── components/
        ├── Skeleton.tsx          # NEW
        └── EmptyState.tsx        # NEW
```

---

## App Completion Status

At this point, the core app is complete:

- [x] Navigation and basic UI
- [x] Supabase connection
- [x] Email authentication
- [x] User profiles
- [x] Goal creation
- [x] Accountability partners (invite links)
- [x] Photo upload
- [x] AI verification
- [x] Apple subscriptions (stakes)
- [x] Trial/payment flow
- [x] History and stats

---

## Next Phase

Proceed to [Phase 12: Google Login](./phase-12-google-login.md) to add OAuth sign-in option.
