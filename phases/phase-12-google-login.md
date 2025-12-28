# Phase 12: Google Login (Optional)

**Goal:** Add "Sign in with Google" option
**Test:** Tap Google button → OAuth flow → logged in

---

## Prerequisites

- Phase 11 completed
- Google Cloud Console access
- Supabase project

---

## Step 1: Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google+ API" (APIs & Services → Enable APIs)
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Configure consent screen first if prompted
6. Create iOS OAuth Client ID:
   - Application type: iOS
   - Bundle ID: Your app bundle ID (e.g., `com.yourname.accountability`)
   - Download the plist file (contains client ID)

---

## Step 2: Configure Supabase Google Auth

In Supabase Dashboard → Authentication → Providers → Google:

1. Enable Google provider
2. Add Client ID from Google Cloud Console
3. Add Client Secret (from Google Cloud Console)
4. Note the Callback URL shown (you'll need it)

---

## Step 3: Update Google Cloud Console

Add the Supabase callback URL to your OAuth client:

1. Go to Credentials → Your OAuth 2.0 Client ID
2. Add to "Authorized redirect URIs":
   - `https://your-project.supabase.co/auth/v1/callback`

---

## Step 4: Install Google Sign-In Package

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

---

## Step 5: Update App Configuration

```json
// app.json
{
  "expo": {
    "scheme": "accountability",
    "ios": {
      "bundleIdentifier": "com.yourname.accountability",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "com.googleusercontent.apps.YOUR_CLIENT_ID"
            ]
          }
        ]
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-auth-session",
        {
          "scheme": "accountability"
        }
      ]
    ]
  }
}
```

---

## Step 6: Create Google Auth Service

```typescript
// features/auth/services/googleAuthService.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/shared/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Result } from '@/shared/types/common.types';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Your Google Client IDs
const GOOGLE_IOS_CLIENT_ID = 'your-ios-client-id.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = 'your-web-client-id.apps.googleusercontent.com';

export const googleAuthService = {
  getGoogleAuthConfig(): Google.GoogleAuthRequestConfig {
    return {
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email']
    };
  },

  async signInWithIdToken(idToken: string): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data.user === null) {
      return { success: false, error: new Error('No user returned from Google sign-in') };
    }

    return { success: true, data: data.user };
  }
};
```

---

## Step 7: Create Google Sign-In Hook

```typescript
// features/auth/hooks/useGoogleAuth.ts
import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { googleAuthService } from '../services/googleAuthService';
import { profileService } from '@/features/profile';
import type { User } from '@supabase/supabase-js';
import type { Result } from '@/shared/types/common.types';

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  isLoading: boolean;
}

export function useGoogleAuth(
  onSuccess: (user: User) => void,
  onError: (error: Error) => void
): UseGoogleAuthReturn {
  const config = googleAuthService.getGoogleAuthConfig();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(config);

  useEffect(() => {
    async function handleResponse(): Promise<void> {
      if (response?.type === 'success') {
        const { id_token: idToken } = response.params;

        if (idToken === undefined) {
          onError(new Error('No ID token received from Google'));
          return;
        }

        const result = await googleAuthService.signInWithIdToken(idToken);

        if (!result.success) {
          onError(result.error);
          return;
        }

        // Create profile if new user
        const profileResult = await profileService.getByUserId(result.data.id);
        if (profileResult.success && profileResult.data === null) {
          await profileService.create({ user_id: result.data.id });
        }

        onSuccess(result.data);
      } else if (response?.type === 'error') {
        onError(new Error(response.error?.message ?? 'Google sign-in failed'));
      }
    }

    if (response !== null) {
      void handleResponse();
    }
  }, [response, onSuccess, onError]);

  async function signIn(): Promise<void> {
    await promptAsync();
  }

  return {
    signIn,
    isLoading: request === null
  };
}
```

---

## Step 8: Create Google Sign-In Button Component

```typescript
// features/auth/components/GoogleSignInButton.tsx
import { Pressable, Text, View, ActivityIndicator, Image } from 'react-native';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function GoogleSignInButton({
  onPress,
  isLoading = false,
  disabled = false
}: GoogleSignInButtonProps): JSX.Element {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center py-3 px-4 rounded-lg border border-gray-300 bg-white ${
        isDisabled ? 'opacity-50' : 'active:bg-gray-50'
      }`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <>
          <GoogleIcon />
          <Text className="ml-3 text-gray-700 font-medium text-base">
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <View className="w-5 h-5">
      {/* Inline SVG as View components - or use an image */}
      <View className="w-5 h-5 items-center justify-center">
        <Text style={{ fontSize: 18 }}>G</Text>
      </View>
    </View>
  );
}

// Alternative: Use actual Google logo image
// <Image
//   source={require('@/assets/google-logo.png')}
//   className="w-5 h-5"
//   resizeMode="contain"
// />
```

---

## Step 9: Update Login Form

```typescript
// features/auth/components/LoginForm.tsx
import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { validateEmail, validatePassword } from '@/shared/utils/validation';
import type { User } from '@supabase/supabase-js';

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

  function handleGoogleSuccess(_user: User): void {
    router.replace('/(tabs)');
  }

  function handleGoogleError(error: Error): void {
    Alert.alert('Google Sign-In Failed', error.message);
  }

  const { signIn: googleSignIn, isLoading: googleLoading } = useGoogleAuth(
    handleGoogleSuccess,
    handleGoogleError
  );

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
    if (!validate()) return;

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
      {/* Google Sign-In */}
      <GoogleSignInButton
        onPress={(): void => void googleSignIn()}
        isLoading={googleLoading}
      />

      {/* Divider */}
      <View className="flex-row items-center gap-4 my-2">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-gray-500 text-sm">or</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      {/* Email/Password */}
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

---

## Step 10: Update Signup Form

```typescript
// features/auth/components/SignupForm.tsx
// Similar update - add GoogleSignInButton at the top

import { GoogleSignInButton } from './GoogleSignInButton';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

// In component:
const { signIn: googleSignIn, isLoading: googleLoading } = useGoogleAuth(
  handleGoogleSuccess,
  handleGoogleError
);

// In JSX (at the top of the form):
<GoogleSignInButton
  onPress={(): void => void googleSignIn()}
  isLoading={googleLoading}
/>

{/* Divider */}
<View className="flex-row items-center gap-4 my-2">
  <View className="flex-1 h-px bg-gray-200" />
  <Text className="text-gray-500 text-sm">or</Text>
  <View className="flex-1 h-px bg-gray-200" />
</View>

{/* Rest of the email signup form */}
```

---

## Step 11: Export Google Auth Components

```typescript
// features/auth/index.ts
export { AuthProvider, useAuth } from './context/AuthContext';
export { authService } from './services/authService';
export { googleAuthService } from './services/googleAuthService';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
export { GoogleSignInButton } from './components/GoogleSignInButton';
export { useGoogleAuth } from './hooks/useGoogleAuth';
export type {
  AuthState,
  AuthContextValue,
  SignUpCredentials,
  SignInCredentials
} from './types/auth.types';
```

---

## Step 12: Handle OAuth Deep Links

Expo Router handles deep links automatically, but verify your app.json scheme is set:

```json
{
  "expo": {
    "scheme": "accountability"
  }
}
```

---

## Verification Checklist

### Setup Verification

1. Google Cloud Console:
   - [ ] OAuth consent screen configured
   - [ ] iOS OAuth Client ID created
   - [ ] Bundle ID matches app

2. Supabase:
   - [ ] Google provider enabled
   - [ ] Client ID and Secret added
   - [ ] Callback URL configured in Google Console

### Manual Testing

```bash
# 1. Rebuild the app (needed for native config changes)
npx expo prebuild --clean
npx expo run:ios

# Or use EAS Build
npx eas build --profile development --platform ios
```

1. **View login screen**: See "Continue with Google" button
2. **Tap Google button**: Opens Google sign-in web view
3. **Sign in with Google**: Select/enter Google account
4. **Redirect back**: App receives auth callback
5. **Logged in**: Navigates to Dashboard
6. **Check profile**: Google email shown
7. **Logout and re-login**: Google sign-in works again
8. **Supabase check**: New user in Auth users with Google provider

---

## Files Created/Modified

```
accountability-app/
├── app.json                           # MODIFIED (schemes, plugins)
├── features/
│   └── auth/
│       ├── components/
│       │   ├── LoginForm.tsx          # MODIFIED
│       │   ├── SignupForm.tsx         # MODIFIED
│       │   └── GoogleSignInButton.tsx # NEW
│       ├── hooks/
│       │   └── useGoogleAuth.ts       # NEW
│       ├── services/
│       │   └── googleAuthService.ts   # NEW
│       └── index.ts                   # MODIFIED
```

---

## Troubleshooting

### "Invalid Client ID"
- Verify bundle ID matches exactly
- Ensure iOS Client ID is used (not web)

### "Redirect URI Mismatch"
- Add Supabase callback URL to Google Console
- Check for trailing slashes

### "Sign-in Cancelled"
- User closed the browser
- Not an error, handle gracefully

### Deep Link Not Working
- Verify scheme in app.json
- Rebuild native app after changes

---

## Security Notes

1. **Never expose** the Google Client Secret in client code
2. **ID tokens** are short-lived and secure to use
3. **Supabase validates** the ID token server-side
4. **Profile creation** happens after successful auth

---

## Complete App Summary

Congratulations! The Accountability App is now complete with:

### Core Features
- Email & Google authentication
- User profiles
- Goal creation with deadlines
- Photo proof submission
- AI verification (Gemini)
- Accountability partners via invite links

### Payment Flow
- Apple subscription stakes
- Free trial = goal deadline
- Complete goal = cancel subscription (no charge)
- Miss deadline = charged stake amount

### UI/UX
- Tab navigation
- Pull-to-refresh
- Loading states
- Error handling
- History with stats

### Architecture
- Vertical slice organization
- Strict TypeScript (no `as` casts)
- ESLint with Airbnb config
- Clean separation of concerns

---

## Production Checklist

Before launching:

- [ ] Replace all sandbox/test credentials with production
- [ ] Enable email confirmation in Supabase
- [ ] Set up proper error monitoring (Sentry)
- [ ] Configure App Store Connect for production
- [ ] Submit app for App Store review
- [ ] Test payment flows in production sandbox
- [ ] Set up customer support flow for billing issues
