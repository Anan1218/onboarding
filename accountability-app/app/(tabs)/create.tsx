import type { JSX } from 'react';
import { Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
          <Text className="text-2xl font-bold text-gray-900 mb-6">Create Goal</Text>
          <GoalForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
