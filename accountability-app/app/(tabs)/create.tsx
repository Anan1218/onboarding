import type { JSX } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Create Habit</Text>
        <Text className="text-gray-600 mt-2 text-center">
          Set up a new habit with stakes
        </Text>
      </View>
    </SafeAreaView>
  );
}
