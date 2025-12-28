import type { JSX } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscriptionContext } from '../context/SubscriptionContext';

export function SubscriptionBadge(): JSX.Element {
  const router = useRouter();
  const { isPremium, isLoading } = useSubscriptionContext();

  if (isLoading) {
    return <View />;
  }

  if (isPremium) {
    return (
      <View className="bg-amber-100 px-3 py-1 rounded-full">
        <Text className="text-amber-800 text-sm font-medium">Premium</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={(): void => router.push('/subscription')}
      className="bg-sky-100 px-3 py-1 rounded-full active:opacity-70"
    >
      <Text className="text-sky-800 text-sm font-medium">Upgrade</Text>
    </Pressable>
  );
}
