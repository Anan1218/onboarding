import type { JSX } from 'react';
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
  { label: '30 Days', days: 30 },
];

// Stake options will be replaced with real products in Phase 9
const STAKE_OPTIONS = [
  { label: 'Free', cents: 0 },
  { label: '$5', cents: 500 },
  { label: '$10', cents: 1000 },
  { label: '$20', cents: 2000 },
  { label: '$50', cents: 5000 },
];

export function GoalForm(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    deadlineDays: 7,
    stakeAmountCents: 0,
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
      stakeAmountCents: formData.stakeAmountCents,
    });

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', 'Failed to create goal');
      return;
    }

    Alert.alert('Success', 'Goal created!', [
      { text: 'OK', onPress: (): void => router.replace('/(tabs)') },
    ]);
  }

  function updateFormData(updates: Partial<GoalFormData>): void {
    setFormData((prev) => ({ ...prev, ...updates }));
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
          multiline
          numberOfLines={3}
        />
        <Text className="text-xs text-gray-500 mt-1">
          Describe what the AI should look for to verify your goal
        </Text>
      </View>

      {/* Deadline */}
      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Deadline</Text>
        <View className="flex-row flex-wrap gap-2">
          {DEADLINE_OPTIONS.map((option) => (
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
                  formData.deadlineDays === option.days ? 'text-white font-medium' : 'text-gray-700'
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
          {STAKE_OPTIONS.map((option) => (
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
        <Button title="Create Goal" onPress={(): void => void handleSubmit()} loading={isLoading} />
      </View>
    </View>
  );
}
