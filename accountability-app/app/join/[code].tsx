import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { inviteService } from '@/features/invite/services/inviteService';
import type { Goal } from '@/features/goals';
import { formatRelativeDate } from '@/shared/utils/formatters';

interface InviteDetails {
  goal: Goal;
  ownerUsername: string | null;
  isAlreadyParticipant: boolean;
}

export default function JoinScreen(): JSX.Element {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite(): Promise<void> {
      if (code === undefined) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      const result = await inviteService.getInviteDetails(code, user?.id);

      if (!result.success) {
        setError(result.error.message);
      } else {
        setInviteDetails(result.data);
      }

      setIsLoading(false);
    }

    if (!authLoading) {
      void loadInvite();
    }
  }, [code, user?.id, authLoading]);

  async function handleJoin(): Promise<void> {
    if (inviteDetails === null || user === null) return;

    setIsJoining(true);

    const result = await inviteService.joinGoal(inviteDetails.goal.id, user.id);

    setIsJoining(false);

    if (!result.success) {
      Alert.alert('Error', result.error.message);
      return;
    }

    Alert.alert('Success', 'You are now an accountability partner!', [
      {
        text: 'View Goal',
        onPress: (): void => router.replace(`/goal/${inviteDetails.goal.id}`),
      },
    ]);
  }

  function handleLoginFirst(): void {
    router.push(`/(auth)/login?redirect=/join/${code ?? ''}`);
  }

  if (isLoading || authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Join Goal' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Invalid Invite' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center text-lg mb-4">{error}</Text>
          <Button
            title="Go Home"
            onPress={(): void => router.replace('/')}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (inviteDetails === null) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Join Goal' }} />
        <Text className="text-gray-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const { goal, ownerUsername, isAlreadyParticipant } = inviteDetails;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Join as Partner' }} />
      <View className="flex-1 p-6">
        {/* Goal Info */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
            <Text className="text-2xl">🎯</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-1">You're invited to support</Text>
          <Text className="text-xl font-bold text-gray-900 text-center">{goal.title}</Text>
          {ownerUsername !== null && (
            <Text className="text-gray-600 mt-1">by {ownerUsername}</Text>
          )}
        </View>

        {/* Goal Details */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="text-gray-600 mb-3">{goal.description}</Text>
          <Text className="text-sm text-gray-500">
            Deadline: {formatRelativeDate(goal.deadline)}
          </Text>
        </View>

        {/* What Partners Do */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            As an accountability partner, you can:
          </Text>
          <View className="gap-2">
            <PartnerBenefit text="View their progress and proof submissions" />
            <PartnerBenefit text="Get notified when they submit proof" />
            <PartnerBenefit text="Encourage them to stay on track" />
          </View>
        </View>

        {/* Actions */}
        <View className="flex-1" />

        {!isAuthenticated ? (
          <View className="gap-3">
            <Button title="Log In to Join" onPress={handleLoginFirst} />
            <Button
              title="Create Account"
              onPress={(): void => router.push('/(auth)/signup')}
              variant="secondary"
            />
          </View>
        ) : isAlreadyParticipant ? (
          <View className="bg-green-50 p-4 rounded-xl items-center gap-3">
            <Text className="text-green-700 font-medium">
              You're already a partner for this goal!
            </Text>
            <Button
              title="View Goal"
              onPress={(): void => router.replace(`/goal/${goal.id}`)}
              variant="secondary"
            />
          </View>
        ) : (
          <Button
            title="Join as Accountability Partner"
            onPress={(): void => void handleJoin()}
            loading={isJoining}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function PartnerBenefit({ text }: { text: string }): JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-green-600">✓</Text>
      <Text className="text-gray-700 flex-1">{text}</Text>
    </View>
  );
}
