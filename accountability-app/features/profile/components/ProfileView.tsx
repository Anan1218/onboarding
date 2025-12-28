import type { JSX } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Profile } from '../types/profile.types';

interface ProfileViewProps {
  profile: Profile;
  email: string;
  onEditPress: () => void;
}

export function ProfileView({ profile, email, onEditPress }: ProfileViewProps): JSX.Element {
  return (
    <View className="w-full">
      {/* Avatar */}
      <View className="items-center mb-6">
        <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center mb-3">
          <Text className="text-4xl text-primary-600">
            {(profile.username ?? email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-bold text-gray-900">
          {profile.username ?? 'No username set'}
        </Text>
        <Text className="text-gray-500">{email}</Text>
      </View>

      {/* Profile Details */}
      <View className="bg-gray-50 rounded-xl p-4 gap-4">
        <ProfileField label="Username" value={profile.username ?? 'Not set'} />
        <ProfileField label="Venmo Handle" value={profile.venmo_handle ?? 'Not set'} />
        <ProfileField label="Member Since" value={formatDate(profile.created_at)} />
      </View>

      {/* Edit Button */}
      <Pressable
        onPress={onEditPress}
        className="mt-6 py-3 px-4 border border-primary-600 rounded-lg items-center active:bg-primary-50"
      >
        <Text className="text-primary-600 font-semibold">Edit Profile</Text>
      </Pressable>
    </View>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
}

function ProfileField({ label, value }: ProfileFieldProps): JSX.Element {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
