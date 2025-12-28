import type { JSX } from 'react';
import { useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { ProfileView } from '@/features/profile/components/ProfileView';
import { ProfileEditForm } from '@/features/profile/components/ProfileEditForm';

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, isLoading, error, updateProfile } = useProfile(user?.id);
  const [isEditing, setIsEditing] = useState(false);

  async function handleLogout(): Promise<void> {
    const result = await signOut();

    if (!result.success) {
      Alert.alert('Error', 'Failed to log out');
      return;
    }

    router.replace('/(auth)/login');
  }

  function confirmLogout(): void {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: (): void => void handleLogout() },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null || profile === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center mb-4">
            {error?.message ?? 'Profile not found'}
          </Text>
          <Button title="Log Out" onPress={confirmLogout} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {isEditing ? (
          <ProfileEditForm
            profile={profile}
            onSave={updateProfile}
            onCancel={(): void => setIsEditing(false)}
          />
        ) : (
          <ProfileView
            profile={profile}
            email={user?.email ?? 'Unknown'}
            onEditPress={(): void => setIsEditing(true)}
          />
        )}

        <View className="mt-8 pt-8 border-t border-gray-200">
          <Button title="Log Out" onPress={confirmLogout} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
