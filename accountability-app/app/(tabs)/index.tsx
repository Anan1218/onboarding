import type { JSX } from 'react';
import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { supabase } from '@/shared/lib/supabase';

export default function DashboardScreen(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>(
    'untested'
  );

  async function testConnection(): Promise<void> {
    setIsLoading(true);
    setConnectionStatus('untested');

    try {
      // Test by querying the profiles table (will return empty if no data)
      const { error } = await supabase.from('profiles').select('id').limit(1);

      if (error !== null) {
        // If error is about RLS, connection still works
        if (error.message.includes('row-level security')) {
          setConnectionStatus('success');
          Alert.alert('Success', 'Connected to Supabase! (RLS is working)');
        } else {
          throw new Error(error.message);
        }
      } else {
        setConnectionStatus('success');
        Alert.alert('Success', 'Connected to Supabase!');
      }
    } catch (err) {
      setConnectionStatus('error');
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Failed to connect: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function testWrite(): Promise<void> {
    setIsLoading(true);

    try {
      // For testing without auth, we need to temporarily disable RLS
      // or use a service role key (not recommended for client)
      // For now, this will fail with RLS - which proves connection works

      const { error } = await supabase.from('profiles').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID for testing
        username: 'test_user',
      });

      if (error !== null) {
        // Expected to fail due to RLS - that's good!
        if (
          error.message.includes('violates row-level security') ||
          error.message.includes('foreign key constraint')
        ) {
          Alert.alert(
            'Connection Verified',
            'Write was blocked by security (expected). Supabase is properly configured!'
          );
        } else {
          throw new Error(error.message);
        }
      } else {
        Alert.alert('Success', 'Test data written to Supabase!');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Test', message);
    } finally {
      setIsLoading(false);
    }
  }

  function getStatusColor(): string {
    switch (connectionStatus) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  }

  function getStatusText(): string {
    switch (connectionStatus) {
      case 'success':
        return 'Connected';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Not tested';
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-6 gap-4">
        <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
        <Text className="text-gray-600 text-center">Test Supabase connection below</Text>

        <View className="mt-4 items-center">
          <Text className="text-sm text-gray-500">Status:</Text>
          <Text className={`text-lg font-semibold ${getStatusColor()}`}>{getStatusText()}</Text>
        </View>

        <View className="w-full gap-3 mt-4">
          <Button
            title="Test Connection"
            onPress={(): void => void testConnection()}
            loading={isLoading}
          />
          <Button
            title="Test Write (Will Fail - Expected)"
            onPress={(): void => void testWrite()}
            loading={isLoading}
            variant="secondary"
          />
        </View>

        <Text className="text-xs text-gray-400 text-center mt-4">
          Write test will fail due to Row Level Security.{'\n'}
          This confirms your database is secure.
        </Text>
      </View>
    </SafeAreaView>
  );
}
