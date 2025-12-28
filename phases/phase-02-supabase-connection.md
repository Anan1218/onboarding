# Phase 2: Supabase Connection

**Goal:** App connects to Supabase, can read/write data
**Test:** Press a button, see data appear in Supabase dashboard

---

## Prerequisites

- Phase 1 completed
- Supabase account (free tier works)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down:
   - Project URL: `https://xxx.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

---

## Step 2: Install Supabase Client

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

---

## Step 3: Configure Environment Variables

```bash
# .env.local (create this file - never commit it)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```gitignore
# .gitignore (add these lines)
.env.local
.env.*.local
```

```typescript
// shared/constants/config.ts
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export const config = {
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY')
  }
} as const;
```

---

## Step 4: Create Supabase Client

```typescript
// shared/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/shared/constants/config';
import type { Database } from '@/shared/types/database.types';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);
```

---

## Step 5: Create Database Types (Initial)

```typescript
// shared/types/database.types.ts
// This file will be auto-generated later using Supabase CLI
// For now, define manually and update as we add tables

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          venmo_handle: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          venmo_handle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string | null;
          venmo_handle?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type ProfileInsert = InsertTables<'profiles'>;
export type ProfileUpdate = UpdateTables<'profiles'>;
```

---

## Step 6: Create Profiles Table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- supabase/migrations/00001_create_profiles.sql

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  venmo_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
```

---

## Step 7: Create Profile Service

```typescript
// features/profile/types/profile.types.ts
import type { Profile, ProfileInsert, ProfileUpdate } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

export type { Profile, ProfileInsert, ProfileUpdate };

export interface ProfileService {
  getByUserId: (userId: string) => Promise<Result<Profile | null>>;
  create: (data: ProfileInsert) => Promise<Result<Profile>>;
  update: (userId: string, data: ProfileUpdate) => Promise<Result<Profile>>;
}
```

```typescript
// features/profile/services/profileService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Profile, ProfileInsert, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

export const profileService = {
  async getByUserId(userId: string): Promise<Result<Profile | null>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data };
  },

  async create(input: ProfileInsert): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .insert(input)
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data };
  },

  async update(userId: string, input: ProfileUpdate): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .update(input)
      .eq('user_id', userId)
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data };
  }
};
```

```typescript
// features/profile/index.ts
export { profileService } from './services/profileService';
export type { Profile, ProfileInsert, ProfileUpdate } from './types/profile.types';
```

---

## Step 8: Create Test Button Component

```typescript
// shared/components/Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary'
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;

  const baseClasses = 'px-6 py-3 rounded-lg items-center justify-center';
  const variantClasses =
    variant === 'primary'
      ? isDisabled
        ? 'bg-primary-300'
        : 'bg-primary-600 active:bg-primary-700'
      : isDisabled
        ? 'bg-gray-200'
        : 'bg-gray-100 active:bg-gray-200';

  const textClasses =
    variant === 'primary'
      ? 'text-white font-semibold text-base'
      : 'text-gray-900 font-semibold text-base';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#374151'} />
      ) : (
        <Text className={textClasses}>{title}</Text>
      )}
    </Pressable>
  );
}
```

---

## Step 9: Create Connection Test Screen

Update the Dashboard screen temporarily to test Supabase connection:

```typescript
// app/(tabs)/index.tsx
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
        username: 'test_user'
      });

      if (error !== null) {
        // Expected to fail due to RLS - that's good!
        if (error.message.includes('violates row-level security') ||
            error.message.includes('foreign key constraint')) {
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
        <Text className="text-gray-600 text-center">
          Test Supabase connection below
        </Text>

        <View className="mt-4 items-center">
          <Text className="text-sm text-gray-500">Status:</Text>
          <Text className={`text-lg font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </Text>
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
```

---

## Step 10: Type Guard Utilities

```typescript
// shared/utils/typeGuards.ts
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
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

1. Open app in Expo Go
2. On Dashboard, tap "Test Connection"
3. Should see success alert (connected to Supabase)
4. Tap "Test Write (Will Fail - Expected)"
5. Should see message about RLS blocking the write
6. Go to Supabase Dashboard → Table Editor
7. Confirm `profiles` table exists with correct columns

---

## Files Created/Modified

```
accountability-app/
├── shared/
│   ├── lib/
│   │   └── supabase.ts          # NEW
│   ├── constants/
│   │   └── config.ts            # NEW
│   ├── components/
│   │   └── Button.tsx           # NEW
│   ├── types/
│   │   ├── common.types.ts      # EXISTS
│   │   └── database.types.ts    # NEW
│   └── utils/
│       └── typeGuards.ts        # NEW
├── features/
│   └── profile/
│       ├── services/
│       │   └── profileService.ts # NEW
│       ├── types/
│       │   └── profile.types.ts  # NEW
│       └── index.ts              # NEW
├── supabase/
│   └── migrations/
│       └── 00001_create_profiles.sql # NEW (run in Supabase)
├── app/
│   └── (tabs)/
│       └── index.tsx            # MODIFIED (test buttons)
├── .env.local                   # NEW (not committed)
└── .gitignore                   # MODIFIED
```

---

## Database State After Phase 2

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profile data | Enabled |

---

## Next Phase

Proceed to [Phase 3: Email Auth](./phase-03-email-auth.md) to implement authentication.
