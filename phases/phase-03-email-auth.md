# Phase 3: Email Auth

**Goal:** User can sign up, log in, log out with email
**Test:** Create account, log out, log back in, sessions persist after restart

---

## Prerequisites

- Phase 2 completed
- Supabase project with Auth enabled

---

## Step 1: Configure Supabase Auth Settings

In Supabase Dashboard → Authentication → Settings:

1. **Email Auth**: Enable "Email" provider
2. **Confirm Email**: Disable for development (enable for production)
3. **Site URL**: Set to `accountability://` (your app scheme)

---

## Step 2: Create Auth Types

```typescript
// features/auth/types/auth.types.ts
import type { Session, User, AuthError } from '@supabase/supabase-js';
import type { Result } from '@/shared/types/common.types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  signUp: (credentials: SignUpCredentials) => Promise<Result<User>>;
  signIn: (credentials: SignInCredentials) => Promise<Result<User>>;
  signOut: () => Promise<Result<void>>;
}

export type AuthResult<T> = Result<T, AuthError>;
```

---

## Step 3: Create Auth Service

```typescript
// features/auth/services/authService.ts
import { supabase } from '@/shared/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { SignUpCredentials, SignInCredentials } from '../types/auth.types';
import type { Result } from '@/shared/types/common.types';

interface SessionData {
  user: User;
  session: Session;
}

export const authService = {
  async signUp(credentials: SignUpCredentials): Promise<Result<SessionData>> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password
    });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data.user === null || data.session === null) {
      return {
        success: false,
        error: new Error('Sign up succeeded but no user/session returned')
      };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session }
    };
  },

  async signIn(credentials: SignInCredentials): Promise<Result<SessionData>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data.user === null || data.session === null) {
      return {
        success: false,
        error: new Error('Sign in succeeded but no user/session returned')
      };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session }
    };
  },

  async signOut(): Promise<Result<void>> {
    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: undefined };
  },

  async getSession(): Promise<Result<Session | null>> {
    const { data, error } = await supabase.auth.getSession();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: data.session };
  },

  onAuthStateChange(
    callback: (user: User | null, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });

    return { unsubscribe: data.subscription.unsubscribe };
  }
};
```

---

## Step 4: Create Auth Context

```typescript
// features/auth/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { profileService } from '@/features/profile';
import type {
  AuthContextValue,
  SignUpCredentials,
  SignInCredentials
} from '../types/auth.types';
import type { Result } from '@/shared/types/common.types';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initialize(): Promise<void> {
      const result = await authService.getSession();
      if (result.success && result.data !== null) {
        setSession(result.data);
        setUser(result.data.user);
      }
      setIsLoading(false);
    }

    void initialize();

    // Listen for auth changes
    const { unsubscribe } = authService.onAuthStateChange((newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);
    });

    return (): void => {
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<Result<User>> => {
      const result = await authService.signUp(credentials);

      if (!result.success) {
        return result;
      }

      // Create profile for new user
      const profileResult = await profileService.create({
        user_id: result.data.user.id
      });

      if (!profileResult.success) {
        // Log but don't fail - profile can be created later
        console.error('Failed to create profile:', profileResult.error);
      }

      return { success: true, data: result.data.user };
    },
    []
  );

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<Result<User>> => {
      const result = await authService.signIn(credentials);

      if (!result.success) {
        return result;
      }

      return { success: true, data: result.data.user };
    },
    []
  );

  const signOut = useCallback(async (): Promise<Result<void>> => {
    return authService.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: user !== null,
      signUp,
      signIn,
      signOut
    }),
    [user, session, isLoading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
```

---

## Step 5: Create Form Input Component

```typescript
// shared/components/Input.tsx
import { TextInput, View, Text } from 'react-native';
import { useState } from 'react';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  autoComplete?: 'email' | 'password' | 'username' | 'off';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  autoComplete = 'off'
}: InputProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = error !== undefined && error !== '';
  const borderColor = hasError
    ? 'border-red-500'
    : isFocused
      ? 'border-primary-500'
      : 'border-gray-300';

  return (
    <View className="w-full">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        onFocus={(): void => setIsFocused(true)}
        onBlur={(): void => setIsFocused(false)}
        className={`w-full px-4 py-3 border rounded-lg text-base text-gray-900 bg-white ${borderColor}`}
        placeholderTextColor="#9CA3AF"
      />
      {hasError && (
        <Text className="text-sm text-red-500 mt-1">{error}</Text>
      )}
    </View>
  );
}
```

---

## Step 6: Create Auth Forms

```typescript
// features/auth/components/LoginForm.tsx
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

      <Button
        title="Log In"
        onPress={(): void => void handleSubmit()}
        loading={isLoading}
      />

      <View className="flex-row justify-center mt-4">
        <Text className="text-gray-600">Don't have an account? </Text>
        <Link href="/(auth)/signup" className="text-primary-600 font-semibold">
          Sign Up
        </Link>
      </View>
    </View>
  );
}
```

```typescript
// features/auth/components/SignupForm.tsx
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
      { text: 'OK', onPress: (): void => router.replace('/(tabs)') }
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
```

---

## Step 7: Create Validation Utilities

```typescript
// shared/utils/validation.ts
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (email.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email' };
  }

  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  return { isValid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}
```

---

## Step 8: Update Auth Screens

```typescript
// app/(auth)/login.tsx
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-8">
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 text-center">
                Welcome Back
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Log in to continue
              </Text>
            </View>

            <LoginForm />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

```typescript
// app/(auth)/signup.tsx
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignupForm } from '@/features/auth/components/SignupForm';

export default function SignupScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-8">
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 text-center">
                Create Account
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Start your accountability journey
              </Text>
            </View>

            <SignupForm />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

---

## Step 9: Update Root Layout with Auth Provider

```typescript
// app/_layout.tsx
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth/context/AuthContext';

export default function RootLayout(): JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="goal/[id]" options={{ headerShown: true, title: 'Goal' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

---

## Step 10: Create Auth Guard (Entry Redirect)

```typescript
// app/index.tsx
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/features/auth';

export default function Index(): JSX.Element {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
```

---

## Step 11: Add Logout to Profile Screen

```typescript
// app/(tabs)/profile.tsx
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
      { text: 'Log Out', style: 'destructive', onPress: (): void => void handleLogout() }
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
          <Text className="text-lg font-semibold text-gray-900">
            {user?.email ?? 'Unknown'}
          </Text>
        </View>

        <View className="flex-1" />

        <Button
          title="Log Out"
          onPress={confirmLogout}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}
```

---

## Step 12: Export Auth Feature

```typescript
// features/auth/index.ts
export { AuthProvider, useAuth } from './context/AuthContext';
export { authService } from './services/authService';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export type {
  AuthState,
  AuthContextValue,
  SignUpCredentials,
  SignInCredentials
} from './types/auth.types';
```

---

## Verification Checklist

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. App starts without errors
npx expo start
```

### Manual Testing

1. **Fresh start**: Close app completely, reopen
2. **Redirect**: Should see login screen (not tabs)
3. **Sign up**: Create new account with email/password
4. **Auto-login**: After signup, should redirect to Dashboard
5. **View profile**: Go to Profile tab, see email
6. **Log out**: Tap logout, confirm, should go to login
7. **Log in**: Log back in with same credentials
8. **Session persistence**: Close app, reopen - should still be logged in
9. **Supabase check**: Go to Auth → Users in Supabase dashboard, see new user

---

## Files Created/Modified

```
accountability-app/
├── app/
│   ├── _layout.tsx              # MODIFIED (AuthProvider)
│   ├── index.tsx                # MODIFIED (auth guard)
│   ├── (auth)/
│   │   ├── login.tsx            # MODIFIED
│   │   └── signup.tsx           # MODIFIED
│   └── (tabs)/
│       └── profile.tsx          # MODIFIED (logout)
├── features/
│   └── auth/
│       ├── components/
│       │   ├── LoginForm.tsx    # NEW
│       │   └── SignupForm.tsx   # NEW
│       ├── context/
│       │   └── AuthContext.tsx  # NEW
│       ├── hooks/
│       │   └── useAuth.ts       # (exported from context)
│       ├── services/
│       │   └── authService.ts   # NEW
│       ├── types/
│       │   └── auth.types.ts    # NEW
│       └── index.ts             # NEW
├── shared/
│   ├── components/
│   │   └── Input.tsx            # NEW
│   └── utils/
│       └── validation.ts        # NEW
```

---

## Security Notes

- Passwords are never stored in app - handled by Supabase Auth
- Session tokens stored securely in AsyncStorage
- RLS policies protect data per-user
- Email confirmation disabled for dev - enable in production

---

## Next Phase

Proceed to [Phase 4: User Profile](./phase-04-user-profile.md) to build profile viewing and editing.
