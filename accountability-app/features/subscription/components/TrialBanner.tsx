import type { JSX } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTrial } from '../hooks/useTrial';
import { useSubscriptionContext } from '../context/SubscriptionContext';

export function TrialBanner(): JSX.Element | null {
  const router = useRouter();
  const { trialStatus, isLoading } = useTrial();
  const { isPremium } = useSubscriptionContext();

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Don't show if user has paid premium
  if (isPremium && trialStatus?.isActive !== true) {
    return null;
  }

  // Show trial countdown if trial is active
  if (trialStatus?.isActive === true && trialStatus.daysRemaining !== null) {
    const daysText = trialStatus.daysRemaining === 1 ? 'day' : 'days';

    return (
      <Pressable
        onPress={(): void => router.push('/subscription')}
        className="bg-amber-50 border border-amber-200 mx-4 mb-4 p-3 rounded-xl active:opacity-70"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-amber-900 font-semibold">
              Trial: {trialStatus.daysRemaining} {daysText} left
            </Text>
            <Text className="text-amber-700 text-sm">
              Subscribe now to keep premium features
            </Text>
          </View>
          <View className="bg-amber-600 px-3 py-1 rounded-full">
            <Text className="text-white text-sm font-medium">Subscribe</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Show trial offer if eligible
  if (trialStatus?.isEligible === true) {
    return (
      <Pressable
        onPress={(): void => router.push('/subscription')}
        className="bg-sky-50 border border-sky-200 mx-4 mb-4 p-3 rounded-xl active:opacity-70"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sky-900 font-semibold">Start Free Trial</Text>
            <Text className="text-sky-700 text-sm">
              Try premium free for 7 days
            </Text>
          </View>
          <View className="bg-sky-600 px-3 py-1 rounded-full">
            <Text className="text-white text-sm font-medium">Try Free</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return null;
}
