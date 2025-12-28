import type { JSX } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';

export default function GoalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Goal Details' }} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Goal Detail</Text>
        <Text className="text-gray-600 mt-2">Goal ID: {id}</Text>
        <Text className="text-gray-500 mt-4">Full details coming in Phase 5</Text>
      </View>
    </SafeAreaView>
  );
}
