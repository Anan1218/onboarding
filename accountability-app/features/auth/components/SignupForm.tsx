import type { JSX } from 'react';
import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '@/shared/utils/validation';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function SignupForm(): JSX.Element {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const result = await signUp({ email, password });

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Sign Up Failed', result.error.message);
      return;
    }

    Alert.alert('Success', 'Account created successfully!', [
      { text: 'OK', onPress: (): void => router.replace('/(tabs)') },
    ]);
  }

  return (
    <View className="w-full gap-4">
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        secureTextEntry
        autoComplete="password"
        error={errors.password}
      />

      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm your password"
        secureTextEntry
        autoComplete="password"
        error={errors.confirmPassword}
      />

      <Button
        title="Create Account"
        onPress={(): void => void handleSubmit()}
        loading={isLoading}
      />

      <View className="flex-row justify-center mt-4">
        <Text className="text-gray-600">Already have an account? </Text>
        <Link href="/(auth)/login" className="text-primary-600 font-semibold">
          Log In
        </Link>
      </View>
    </View>
  );
}
