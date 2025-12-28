import type { JSX } from 'react';
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
      <Text className={`text-xs font-medium ${config.textColor}`}>{config.label}</Text>
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
  }
}
