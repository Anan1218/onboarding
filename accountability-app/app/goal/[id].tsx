import type { JSX } from 'react';
import { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { useGoal } from '@/features/goals/hooks/useGoal';
import { InviteLink } from '@/features/invite/components/InviteLink';
import { ParticipantsList } from '@/features/invite/components/ParticipantsList';
import { ProofUploader } from '@/features/proof/components/ProofUploader';
import { ProofDisplay } from '@/features/proof/components/ProofDisplay';
import { useProofSubscription } from '@/features/proof/hooks/useProofSubscription';
import { formatDate, formatCurrency } from '@/shared/utils/formatters';
import type { GoalStatus } from '@/shared/types/database.types';

export default function GoalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { goal, isLoading, error, updateStatus } = useGoal(id);
  const [proofKey, setProofKey] = useState(0);

  const handleProofUploaded = useCallback((): void => {
    // Increment key to force ProofDisplay to refresh
    setProofKey((prev) => prev + 1);
  }, []);

  // Subscribe to real-time verification updates
  useProofSubscription({
    goalId: id,
    onVerificationComplete: handleProofUploaded,
  });

  async function handleCancel(): Promise<void> {
    Alert.alert('Cancel Goal', 'Are you sure you want to cancel this goal?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          const result = await updateStatus('cancelled');
          if (result.success) {
            router.back();
          } else {
            Alert.alert('Error', 'Failed to cancel goal');
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null || goal === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center">{error?.message ?? 'Goal not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = goal.userId === user?.id;
  const isActive = goal.status === 'active' || goal.status === 'pending';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: goal.title }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Title & Status */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</Text>
          <StatusBadge status={goal.status} />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-1">
            What the photo should show:
          </Text>
          <Text className="text-gray-900">{goal.description}</Text>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-6">
          <DetailRow label="Deadline" value={formatDate(goal.deadline)} />
          <DetailRow
            label="Stake"
            value={goal.stakeAmountCents > 0 ? formatCurrency(goal.stakeAmountCents) : 'Free'}
          />
          <DetailRow label="Created" value={formatDate(goal.createdAt)} />
        </View>

        {/* Participants */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Accountability Partners</Text>
          <ParticipantsList goalId={goal.id} />
        </View>

        {/* Invite Link (only for owner) */}
        {isOwner && isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Invite Partner</Text>
            <InviteLink goalId={goal.id} />
          </View>
        )}

        {/* Proof Upload Section */}
        {isOwner && isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Submit Proof</Text>
            <ProofUploader
              goalId={goal.id}
              userId={user?.id ?? ''}
              goalDescription={goal.description}
              onUploadSuccess={handleProofUploaded}
            />
          </View>
        )}

        {/* Proof History */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Proof Submissions</Text>
          <ProofDisplay key={proofKey} goalId={goal.id} />
        </View>

        {/* Actions (only for owner) */}
        {isOwner && isActive && (
          <View className="mt-4">
            <Button
              title="Cancel Goal"
              onPress={(): void => void handleCancel()}
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatusBadgeProps {
  status: GoalStatus;
}

function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = getStatusConfig(status);

  return (
    <View className={`self-start px-3 py-1 rounded-full ${config.bg}`}>
      <Text className={`text-sm font-medium capitalize ${config.text}`}>{status}</Text>
    </View>
  );
}

interface StatusConfig {
  bg: string;
  text: string;
}

function getStatusConfig(status: GoalStatus): StatusConfig {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'active':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'cancelled':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps): JSX.Element {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  );
}
