import type { JSX } from 'react';
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
  emptyMessage = 'No goals yet',
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
