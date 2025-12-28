# Phase 0: Architecture Overview

This document defines the overall architecture, folder structure, and conventions for the Accountability App.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Expo (managed workflow) | SDK 50+ |
| Language | TypeScript | 5.x (strict mode) |
| Navigation | Expo Router | v3 |
| Styling | NativeWind | v4 |
| Backend | Supabase | - |
| Database | PostgreSQL (via Supabase) | - |
| Storage | Supabase Storage | - |
| Auth | Supabase Auth | - |
| Edge Functions | Supabase Edge Functions (Deno) | - |
| AI | Google Gemini API | - |
| Payments | react-native-iap (StoreKit 2) | - |
| Linting | ESLint + Prettier | - |
| Testing | Jest + React Native Testing Library | - |

---

## Vertical Slice Architecture

We organize code by **feature/domain**, not by technical layer. Each feature is self-contained and independently testable.

```
app/                          # Expo Router pages (routes only, minimal logic)
├── (auth)/                   # Auth group (unauthenticated routes)
│   ├── login.tsx
│   ├── signup.tsx
│   └── _layout.tsx
├── (tabs)/                   # Main app tabs (authenticated routes)
│   ├── index.tsx             # Dashboard
│   ├── create.tsx            # Create goal
│   ├── history.tsx           # Past goals
│   ├── profile.tsx           # User profile
│   └── _layout.tsx
├── goal/
│   └── [id].tsx              # Goal detail page
├── join/
│   └── [code].tsx            # Join via invite link
├── _layout.tsx               # Root layout
└── index.tsx                 # Entry redirect

features/                     # Domain-organized feature modules
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── GoogleSignInButton.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── services/
│   │   └── authService.ts
│   ├── types/
│   │   └── auth.types.ts
│   └── index.ts              # Public exports
│
├── profile/
│   ├── components/
│   │   ├── ProfileView.tsx
│   │   └── ProfileEditForm.tsx
│   ├── hooks/
│   │   └── useProfile.ts
│   ├── services/
│   │   └── profileService.ts
│   ├── types/
│   │   └── profile.types.ts
│   └── index.ts
│
├── goals/
│   ├── components/
│   │   ├── GoalForm.tsx
│   │   ├── GoalCard.tsx
│   │   ├── GoalList.tsx
│   │   └── GoalDetail.tsx
│   ├── hooks/
│   │   ├── useGoals.ts
│   │   └── useGoal.ts
│   ├── services/
│   │   └── goalService.ts
│   ├── types/
│   │   └── goal.types.ts
│   └── index.ts
│
├── proof/
│   ├── components/
│   │   ├── ProofUploader.tsx
│   │   ├── ProofDisplay.tsx
│   │   └── VerificationResult.tsx
│   ├── hooks/
│   │   └── useProofUpload.ts
│   ├── services/
│   │   └── proofService.ts
│   ├── types/
│   │   └── proof.types.ts
│   └── index.ts
│
├── subscription/
│   ├── components/
│   │   ├── StakeSelector.tsx
│   │   └── SubscriptionStatus.tsx
│   ├── hooks/
│   │   └── useSubscription.ts
│   ├── services/
│   │   └── subscriptionService.ts
│   ├── types/
│   │   └── subscription.types.ts
│   └── index.ts
│
├── invite/
│   ├── components/
│   │   ├── InviteLink.tsx
│   │   └── JoinConfirmation.tsx
│   ├── hooks/
│   │   └── useInvite.ts
│   ├── services/
│   │   └── inviteService.ts
│   ├── types/
│   │   └── invite.types.ts
│   └── index.ts
│
└── history/
    ├── components/
    │   ├── HistoryList.tsx
    │   └── HistoryCard.tsx
    ├── hooks/
    │   └── useHistory.ts
    ├── services/
    │   └── historyService.ts
    ├── types/
    │   └── history.types.ts
    └── index.ts

shared/                       # Shared utilities (no business logic)
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Loading.tsx
│   └── ErrorBoundary.tsx
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── iap.ts                # In-app purchase setup
├── hooks/
│   └── useAsyncStorage.ts
├── utils/
│   ├── date.ts
│   ├── validation.ts
│   └── formatters.ts
├── types/
│   ├── database.types.ts     # Generated from Supabase
│   └── common.types.ts
└── constants/
    └── config.ts

supabase/                     # Supabase project files
├── migrations/               # SQL migrations
│   ├── 00001_create_profiles.sql
│   ├── 00002_create_goals.sql
│   ├── 00003_create_proof_submissions.sql
│   └── 00004_create_goal_participants.sql
├── functions/                # Edge functions
│   └── verify-proof/
│       └── index.ts
└── seed.sql                  # Development seed data
```

---

## TypeScript Rules

### Strict Mode Configuration

```json
// tsconfig.json
{
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
    "noUnusedParameters": true
  }
}
```

### Banned Patterns

```typescript
// NEVER use these patterns:

// 1. Type assertions with 'as'
const user = data as User;  // BANNED

// 2. Non-null assertion
const name = user!.name;    // BANNED

// 3. 'any' type
function process(data: any) {}  // BANNED

// 4. Type assertions to bypass checks
(value as unknown as TargetType)  // BANNED
```

### Required Patterns

```typescript
// ALWAYS use these patterns:

// 1. Type guards for narrowing
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

// 2. Exhaustive checks with never
function handleStatus(status: GoalStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
  }
}

// 3. Null checks before access
if (user !== null && user !== undefined) {
  console.log(user.name);
}

// 4. Optional chaining with nullish coalescing
const name = user?.profile?.name ?? 'Anonymous';

// 5. Result types for error handling
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await userService.get(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
```

---

## ESLint Configuration

```javascript
// eslint.config.js
module.exports = {
  extends: [
    'expo',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    // Ban dangerous patterns
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'never'
      }
    ],

    // Enforce good patterns
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',

    // React Native specific
    'react-native/no-unused-styles': 'error',
    'react-native/no-inline-styles': 'warn'
  }
};
```

---

## Component Conventions

### Feature Component Template

```typescript
// features/goals/components/GoalCard.tsx
import { View, Text, Pressable } from 'react-native';
import type { Goal } from '../types/goal.types';

interface GoalCardProps {
  goal: Goal;
  onPress: (goalId: string) => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps): JSX.Element {
  function handlePress(): void {
    onPress(goal.id);
  }

  return (
    <Pressable onPress={handlePress} className="bg-white p-4 rounded-lg shadow">
      <Text className="text-lg font-semibold">{goal.title}</Text>
      <Text className="text-gray-600">{goal.description}</Text>
    </Pressable>
  );
}
```

### Hook Template

```typescript
// features/goals/hooks/useGoals.ts
import { useState, useEffect, useCallback } from 'react';
import { goalService } from '../services/goalService';
import type { Goal } from '../types/goal.types';
import type { Result } from '@/shared/types/common.types';

interface UseGoalsReturn {
  goals: Goal[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGoals(userId: string): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await goalService.getByUserId(userId);

    if (result.success) {
      setGoals(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGoals();
  }, [fetchGoals]);

  return { goals, isLoading, error, refetch: fetchGoals };
}
```

### Service Template

```typescript
// features/goals/services/goalService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Goal, CreateGoalInput } from '../types/goal.types';
import type { Result } from '@/shared/types/common.types';

export const goalService = {
  async getByUserId(userId: string): Promise<Result<Goal[]>> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data };
  },

  async create(input: CreateGoalInput): Promise<Result<Goal>> {
    const { data, error } = await supabase
      .from('goals')
      .insert(input)
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data };
  }
};
```

---

## Database Conventions

### Naming
- Tables: `snake_case`, plural (`goals`, `proof_submissions`)
- Columns: `snake_case` (`created_at`, `user_id`)
- Foreign keys: `<table>_id` (`goal_id`, `user_id`)

### Required Columns
Every table must have:
- `id` (uuid, primary key, default gen_random_uuid())
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now(), with trigger)

### Row Level Security
Every table must have RLS enabled with appropriate policies.

---

## Testing Strategy

### Per-Feature Tests

```
features/goals/
├── __tests__/
│   ├── GoalCard.test.tsx       # Component tests
│   ├── useGoals.test.ts        # Hook tests
│   └── goalService.test.ts     # Service tests (mocked Supabase)
```

### Test File Template

```typescript
// features/goals/__tests__/GoalCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { GoalCard } from '../components/GoalCard';
import type { Goal } from '../types/goal.types';

const mockGoal: Goal = {
  id: '123',
  userId: 'user-1',
  title: 'Go to gym',
  description: 'Take a photo at the gym',
  deadline: new Date('2024-12-31'),
  status: 'active',
  stakeAmount: 10,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('GoalCard', () => {
  it('displays goal title and description', () => {
    const { getByText } = render(
      <GoalCard goal={mockGoal} onPress={jest.fn()} />
    );

    expect(getByText('Go to gym')).toBeTruthy();
    expect(getByText('Take a photo at the gym')).toBeTruthy();
  });

  it('calls onPress with goal id when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <GoalCard goal={mockGoal} onPress={onPress} />
    );

    fireEvent.press(getByText('Go to gym'));
    expect(onPress).toHaveBeenCalledWith('123');
  });
});
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `GoalCard.tsx` |
| Hooks | camelCase with `use` prefix | `useGoals.ts` |
| Services | camelCase with `Service` suffix | `goalService.ts` |
| Types | camelCase with `.types.ts` | `goal.types.ts` |
| Tests | same name with `.test.ts(x)` | `GoalCard.test.tsx` |
| Constants | camelCase | `config.ts` |
| Utils | camelCase | `formatters.ts` |

---

## Import Conventions

```typescript
// Use path aliases
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';
import { supabase } from '@/shared/lib/supabase';

// Group imports in order:
// 1. React/React Native
// 2. Third-party libraries
// 3. Shared modules (@/shared)
// 4. Feature modules (@/features)
// 5. Relative imports (types, local)
// 6. Type-only imports last

import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth';

import { goalService } from '../services/goalService';
import type { Goal } from '../types/goal.types';
```

---

## Environment Variables

```bash
# .env.local (never commit)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
```

Access in code:
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (supabaseUrl === undefined) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL is not defined');
}
```
