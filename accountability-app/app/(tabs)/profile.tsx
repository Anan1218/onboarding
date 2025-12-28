import type { JSX } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const { user, signOut } = useAuth();

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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 p-6">
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl text-primary-600">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900">{user?.email ?? 'Unknown'}</Text>
        </View>

        <View className="flex-1" />

        <Button title="Log Out" onPress={confirmLogout} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}
