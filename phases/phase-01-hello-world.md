# Phase 1: Hello World

**Goal:** App runs on your phone with basic navigation
**Test:** Open app on Expo Go, see tabs, navigate between screens

---

## Prerequisites

- Node.js 18+
- Expo Go app on iOS device
- Apple Developer account (for later phases)

---

## Step 1: Create Expo Project

```bash
npx create-expo-app@latest accountability-app --template expo-template-blank-typescript
cd accountability-app
```

---

## Step 2: Install Core Dependencies

```bash
# Navigation
npx expo install expo-router expo-linking expo-constants expo-status-bar

# Styling
npm install nativewind tailwindcss@^3.4
npx expo install react-native-reanimated react-native-safe-area-context react-native-screens react-native-gesture-handler

# Development
npm install -D @types/react eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier
```

---

## Step 3: Configure TypeScript

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

---

## Step 4: Configure NativeWind

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './shared/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1'
        }
      }
    }
  },
  plugins: []
};
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel'
    ]
  };
};
```

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Step 5: Configure Expo Router

```json
// app.json (update existing)
{
  "expo": {
    "name": "Accountability",
    "slug": "accountability-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "accountability",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.accountability"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

```json
// package.json (add main entry)
{
  "main": "expo-router/entry"
}
```

---

## Step 6: Configure ESLint

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Step 7: Create Folder Structure

```bash
mkdir -p app/\(auth\)
mkdir -p app/\(tabs\)
mkdir -p app/goal
mkdir -p features/auth/components features/auth/hooks features/auth/services features/auth/types features/auth/context
mkdir -p features/profile/components features/profile/hooks features/profile/services features/profile/types
mkdir -p features/goals/components features/goals/hooks features/goals/services features/goals/types
mkdir -p features/proof/components features/proof/hooks features/proof/services features/proof/types
mkdir -p features/subscription/components features/subscription/hooks features/subscription/services features/subscription/types
mkdir -p features/invite/components features/invite/hooks features/invite/services features/invite/types
mkdir -p features/history/components features/history/hooks features/history/services features/history/types
mkdir -p shared/components shared/lib shared/hooks shared/utils shared/types shared/constants
mkdir -p supabase/migrations supabase/functions
```

---

## Step 8: Create Root Layout

```typescript
// app/_layout.tsx
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout(): JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="goal/[id]" options={{ headerShown: true, title: 'Goal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

---

## Step 9: Create Entry Redirect

```typescript
// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index(): JSX.Element {
  // Later: check auth state and redirect accordingly
  // For now, always go to tabs
  return <Redirect href="/(tabs)" />;
}
```

---

## Step 10: Create Tab Layout

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

interface TabIconProps {
  label: string;
  focused: boolean;
}

function TabIcon({ label, focused }: TabIconProps): JSX.Element {
  return (
    <View className="items-center justify-center">
      <Text className={focused ? 'text-primary-600 font-bold' : 'text-gray-500'}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon label="Home" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create Goal',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon label="+" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon label="History" focused={focused} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }): JSX.Element => (
            <TabIcon label="Profile" focused={focused} />
          )
        }}
      />
    </Tabs>
  );
}
```

---

## Step 11: Create Placeholder Screens

```typescript
// app/(tabs)/index.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
        <Text className="text-gray-600 mt-2">Your active goals will appear here</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/create.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Create Goal</Text>
        <Text className="text-gray-600 mt-2">Create a new accountability goal</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/history.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">History</Text>
        <Text className="text-gray-600 mt-2">Your past goals will appear here</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/profile.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
        <Text className="text-gray-600 mt-2">Your profile settings</Text>
      </View>
    </SafeAreaView>
  );
}
```

---

## Step 12: Create Auth Layout (Placeholder)

```typescript
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
```

```typescript
// app/(auth)/login.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Login</Text>
        <Text className="text-gray-600 mt-2">Login form coming in Phase 3</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(auth)/signup.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen(): JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl font-bold text-gray-900">Sign Up</Text>
        <Text className="text-gray-600 mt-2">Signup form coming in Phase 3</Text>
      </View>
    </SafeAreaView>
  );
}
```

---

## Step 13: Create Shared Types

```typescript
// shared/types/common.types.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Step 14: Add npm Scripts

```json
// package.json (add to scripts)
{
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json}\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "validate": "npm run typecheck && npm run lint && npm run test"
  }
}
```

---

## Verification Checklist

Run these commands to verify Phase 1 is complete:

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. App starts without errors
npx expo start
```

### Manual Testing

1. Open Expo Go on iOS device
2. Scan QR code from terminal
3. App loads showing Dashboard tab
4. Tap each tab: Dashboard, Create, History, Profile
5. Each screen shows its placeholder content
6. Tab bar highlights active tab

---

## Files Created

```
accountability-app/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── create.tsx
│       ├── history.tsx
│       └── profile.tsx
├── shared/
│   └── types/
│       └── common.types.ts
├── features/
│   ├── auth/
│   ├── profile/
│   ├── goals/
│   ├── proof/
│   ├── subscription/
│   ├── invite/
│   └── history/
├── global.css
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── app.json
└── package.json
```

---

## Next Phase

Proceed to [Phase 2: Supabase Connection](./phase-02-supabase-connection.md) to set up the backend.
