import type { JSX } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { inviteService } from '../services/inviteService';
import { supabase } from '@/shared/lib/supabase';
import type { GoalParticipant } from '../types/invite.types';

interface ParticipantsListProps {
  goalId: string;
}

interface ParticipantWithProfile extends GoalParticipant {
  username: string | null;
}

// Type guard for profile data
function isValidProfileData(data: unknown): data is { username: string | null } {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return 'username' in data && (data.username === null || typeof data.username === 'string');
}

export function ParticipantsList({ goalId }: ParticipantsListProps): JSX.Element {
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadParticipants = useCallback(async (): Promise<void> => {
    const result = await inviteService.getParticipants(goalId);

    if (result.success) {
      // Fetch profiles for each participant
      const withProfiles = await Promise.all(
        result.data.map(async (p): Promise<ParticipantWithProfile> => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', p.userId)
            .single();

          return {
            ...p,
            username: isValidProfileData(profile) ? profile.username : null,
          };
        })
      );

      setParticipants(withProfiles);
    }

    setIsLoading(false);
  }, [goalId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  if (isLoading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#0284c7" />
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-500 text-center">No partners yet</Text>
      </View>
    );
  }

  return (
    <View className="bg-gray-50 rounded-xl p-4 gap-3">
      {participants.map((participant) => (
        <ParticipantRow key={participant.id} participant={participant} />
      ))}
    </View>
  );
}

interface ParticipantRowProps {
  participant: ParticipantWithProfile;
}

function ParticipantRow({ participant }: ParticipantRowProps): JSX.Element {
  const displayName = participant.username ?? 'Anonymous';
  const isOwner = participant.role === 'owner';

  return (
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
        <Text className="text-primary-600 font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-medium text-gray-900">{displayName}</Text>
        <Text className="text-xs text-gray-500">{isOwner ? 'Goal Owner' : 'Partner'}</Text>
      </View>
      {isOwner && (
        <View className="bg-primary-100 px-2 py-1 rounded">
          <Text className="text-xs text-primary-700">Owner</Text>
        </View>
      )}
    </View>
  );
}
