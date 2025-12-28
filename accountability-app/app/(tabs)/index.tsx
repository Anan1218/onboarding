import type { JSX } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
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
            <Link href="/(tabs)/create" asChild>
              <Pressable className="bg-primary-600 py-4 rounded-lg items-center active:bg-primary-700">
                <Text className="text-white font-semibold text-center text-lg">
                  Create Your First Goal
                </Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
