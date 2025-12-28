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
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const result = await signIn({ email, password });

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error.message);
      return;
    }

    router.replace('/(tabs)');
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
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="password"
        error={errors.password}
      />

      <Button title="Log In" onPress={(): void => void handleSubmit()} loading={isLoading} />

      <View className="flex-row justify-center mt-4">
        <Text className="text-gray-600">Don't have an account? </Text>
        <Link href="/(auth)/signup" className="text-primary-600 font-semibold">
          Sign Up
        </Link>
      </View>
    </View>
  );
}
