import type { JSX } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Paywall } from '@/features/subscription';

export default function SubscriptionScreen(): JSX.Element {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Premium',
          presentation: 'modal',
        }}
      />
      <Paywall onClose={(): void => router.back()} />
    </SafeAreaView>
  );
}
