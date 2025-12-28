import type { JSX } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth';
import { GoalList } from '@/features/goals/components/GoalList';
import { useGoalHistory, HistoryStats, HistoryFilter } from '@/features/history';

export default function HistoryScreen(): JSX.Element {
  const { user } = useAuth();
  const { goals, isLoading, error, filter, setFilter, refetch, stats } = useGoalHistory(user?.id);

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
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <>
            {/* Stats */}
            <HistoryStats
              total={stats.total}
              completed={stats.completed}
              failed={stats.failed}
              cancelled={stats.cancelled}
            />

            {/* Filter */}
            <HistoryFilter
              activeFilter={filter}
              onFilterChange={setFilter}
              counts={{
                all: stats.total,
                completed: stats.completed,
                failed: stats.failed,
                cancelled: stats.cancelled,
              }}
            />

            {/* Goals List */}
            <GoalList
              goals={goals}
              isLoading={isLoading}
              onRefresh={refetch}
              emptyMessage={
                filter === 'all'
                  ? 'No completed goals yet. Keep working towards your goals!'
                  : `No ${filter} goals`
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
