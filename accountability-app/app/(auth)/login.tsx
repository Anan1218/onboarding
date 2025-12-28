import type { JSX } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { GoogleSignInButton, useGoogleAuth } from '@/features/auth';

export default function LoginScreen(): JSX.Element {
  const { signIn: googleSignIn, isLoading: isGoogleLoading } = useGoogleAuth();

  async function handleGoogleSignIn(): Promise<void> {
    const result = await googleSignIn();
    if (!result.success) {
      Alert.alert('Sign In Failed', result.error.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-8">
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 text-center">Welcome Back</Text>
              <Text className="text-gray-600 text-center mt-2">Log in to continue</Text>
            </View>

            {/* Google Sign-In */}
            <View className="mb-6">
              <GoogleSignInButton
                onPress={(): void => void handleGoogleSignIn()}
                isLoading={isGoogleLoading}
              />
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="px-4 text-gray-500 text-sm">or</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            <LoginForm />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
