import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/shared/components/Button';
import { useInvite } from '../hooks/useInvite';

interface InviteLinkProps {
  goalId: string;
}

export function InviteLink({ goalId }: InviteLinkProps): JSX.Element {
  const { inviteCode, isLoading, createInvite, loadExistingCode } = useInvite();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadExistingCode(goalId);
  }, [goalId, loadExistingCode]);

  async function handleCreateInvite(): Promise<void> {
    const result = await createInvite(goalId);
    if (!result.success) {
      Alert.alert('Error', 'Failed to create invite link');
    }
  }

  async function handleCopy(): Promise<void> {
    if (inviteCode === null) return;

    const link = `accountability://join/${inviteCode}`;
    await Clipboard.setStringAsync(link);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteCode === null) {
    return (
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-700 mb-3">
          Invite an accountability partner to help keep you on track!
        </Text>
        <Button
          title="Create Invite Link"
          onPress={(): void => void handleCreateInvite()}
          loading={isLoading}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-xl p-4">
      <Text className="text-sm text-gray-600 mb-2">Share this code with your partner:</Text>

      <View className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        <Text className="text-center text-2xl font-mono font-bold text-gray-900 tracking-widest">
          {inviteCode}
        </Text>
      </View>

      <Pressable
        onPress={(): void => void handleCopy()}
        className={`py-3 rounded-lg items-center ${copied ? 'bg-green-100' : 'bg-primary-100'}`}
      >
        <Text className={`font-semibold ${copied ? 'text-green-700' : 'text-primary-700'}`}>
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </Text>
      </Pressable>

      <Text className="text-xs text-gray-500 text-center mt-2">
        Or share: accountability://join/{inviteCode}
      </Text>
    </View>
  );
}
