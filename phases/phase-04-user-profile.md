# Phase 4: User Profile

**Goal:** Logged-in user has a profile they can view/edit
**Test:** Sign up → auto-create profile → view profile → edit username

---

## Prerequisites

- Phase 3 completed
- User can sign up and log in

---

## Step 1: Create Profile Hook

```typescript
// features/profile/hooks/useProfile.ts
import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profileService';
import type { Profile, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

interface UseProfileReturn {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  updateProfile: (data: ProfileUpdate) => Promise<Result<Profile>>;
  refetch: () => Promise<void>;
}

export function useProfile(userId: string | undefined): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (userId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await profileService.getByUserId(userId);

    if (result.success) {
      setProfile(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: ProfileUpdate): Promise<Result<Profile>> => {
      if (userId === undefined) {
        return { success: false, error: new Error('User ID is undefined') };
      }

      const result = await profileService.update(userId, data);

      if (result.success) {
        setProfile(result.data);
      }

      return result;
    },
    [userId]
  );

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch: fetchProfile
  };
}
```

---

## Step 2: Create Profile View Component

```typescript
// features/profile/components/ProfileView.tsx
import { View, Text, Pressable } from 'react-native';
import type { Profile } from '../types/profile.types';

interface ProfileViewProps {
  profile: Profile;
  email: string;
  onEditPress: () => void;
}

export function ProfileView({
  profile,
  email,
  onEditPress
}: ProfileViewProps): JSX.Element {
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
        <ProfileField
          label="Username"
          value={profile.username ?? 'Not set'}
        />
        <ProfileField
          label="Venmo Handle"
          value={profile.venmo_handle ?? 'Not set'}
        />
        <ProfileField
          label="Member Since"
          value={formatDate(profile.created_at)}
        />
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
    year: 'numeric'
  });
}
```

---

## Step 3: Create Profile Edit Form

```typescript
// features/profile/components/ProfileEditForm.tsx
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import type { Profile, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

interface ProfileEditFormProps {
  profile: Profile;
  onSave: (data: ProfileUpdate) => Promise<Result<Profile>>;
  onCancel: () => void;
}

interface FormErrors {
  username?: string;
  venmoHandle?: string;
}

export function ProfileEditForm({
  profile,
  onSave,
  onCancel
}: ProfileEditFormProps): JSX.Element {
  const [username, setUsername] = useState(profile.username ?? '');
  const [venmoHandle, setVenmoHandle] = useState(profile.venmo_handle ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (username.length > 0 && username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (username.length > 30) {
      newErrors.username = 'Username must be 30 characters or less';
    }

    if (venmoHandle.length > 0 && !venmoHandle.startsWith('@')) {
      newErrors.venmoHandle = 'Venmo handle should start with @';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(): Promise<void> {
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const updateData: ProfileUpdate = {
      username: username.length > 0 ? username : null,
      venmo_handle: venmoHandle.length > 0 ? venmoHandle : null
    };

    const result = await onSave(updateData);

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', 'Failed to update profile');
      return;
    }

    Alert.alert('Success', 'Profile updated!');
  }

  return (
    <View className="w-full gap-4">
      <Input
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
        autoCapitalize="none"
        autoComplete="username"
        error={errors.username}
      />

      <Input
        label="Venmo Handle"
        value={venmoHandle}
        onChangeText={setVenmoHandle}
        placeholder="@yourhandle"
        autoCapitalize="none"
        error={errors.venmoHandle}
      />

      <View className="flex-row gap-3 mt-4">
        <View className="flex-1">
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="secondary"
          />
        </View>
        <View className="flex-1">
          <Button
            title="Save"
            onPress={(): void => void handleSave()}
            loading={isLoading}
          />
        </View>
      </View>
    </View>
  );
}
```

---

## Step 4: Update Profile Screen

```typescript
// app/(tabs)/profile.tsx
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
      { text: 'Log Out', style: 'destructive', onPress: (): void => void handleLogout() }
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
          <Button
            title="Log Out"
            onPress={confirmLogout}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## Step 5: Export Profile Feature

```typescript
// features/profile/index.ts
export { profileService } from './services/profileService';
export { useProfile } from './hooks/useProfile';
export { ProfileView } from './components/ProfileView';
export { ProfileEditForm } from './components/ProfileEditForm';
export type { Profile, ProfileInsert, ProfileUpdate } from './types/profile.types';
```

---

## Step 6: Ensure Profile Created on Signup

The AuthContext already creates a profile on signup. Verify in `features/auth/context/AuthContext.tsx`:

```typescript
// In signUp callback (should already exist from Phase 3):
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
      console.error('Failed to create profile:', profileResult.error);
    }

    return { success: true, data: result.data.user };
  },
  []
);
```

---

## Step 7: Handle Missing Profile (Edge Case)

For users who signed up before profile creation was implemented:

```typescript
// features/profile/hooks/useProfile.ts
// Add to fetchProfile function:

const fetchProfile = useCallback(async (): Promise<void> => {
  if (userId === undefined) {
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setError(null);

  const result = await profileService.getByUserId(userId);

  if (result.success) {
    if (result.data === null) {
      // Profile doesn't exist - create it
      const createResult = await profileService.create({ user_id: userId });
      if (createResult.success) {
        setProfile(createResult.data);
      } else {
        setError(createResult.error);
      }
    } else {
      setProfile(result.data);
    }
  } else {
    setError(result.error);
  }

  setIsLoading(false);
}, [userId]);
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

1. **New user signup**: Create new account
2. **Profile auto-created**: Go to Profile tab, should see profile (not error)
3. **View profile**: See email, "Not set" for username/venmo
4. **Edit profile**: Tap "Edit Profile" button
5. **Update username**: Enter username, tap Save
6. **See update**: Profile shows new username
7. **Update venmo**: Add venmo handle (with @), save
8. **Validation**: Try username < 3 chars, see error
9. **Supabase check**: View profiles table, see updated data
10. **Logout/login**: Changes persist after re-login

---

## Files Created/Modified

```
accountability-app/
├── app/
│   └── (tabs)/
│       └── profile.tsx           # MODIFIED
├── features/
│   └── profile/
│       ├── components/
│       │   ├── ProfileView.tsx   # NEW
│       │   └── ProfileEditForm.tsx # NEW
│       ├── hooks/
│       │   └── useProfile.ts     # NEW
│       ├── services/
│       │   └── profileService.ts # EXISTS
│       ├── types/
│       │   └── profile.types.ts  # EXISTS
│       └── index.ts              # MODIFIED
```

---

## Database State After Phase 4

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profile data (username, venmo) | Enabled |

---

## Next Phase

Proceed to [Phase 5: Create a Goal](./phase-05-create-goal.md) to implement goal creation and viewing.
