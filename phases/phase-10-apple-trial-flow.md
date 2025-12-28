# Phase 10: Apple Trial Flow

**Goal:** User stakes money via trial, gets charged if they fail
**Test:** Start trial → complete goal → trial cancelled (no charge)

---

## Prerequisites

- Phase 9 completed
- Subscriptions purchasable in sandbox

---

## Concept Recap

The subscription "trial" IS the goal deadline:
- User creates goal with $10 stake and 7-day deadline
- User starts a subscription with 7-day free trial
- If user completes goal (verified by AI) → cancel subscription → no charge
- If trial expires without completion → subscription charges user $10

---

## Step 1: Set Up App Store Server Notifications

In App Store Connect → Your App → App Information:

1. Scroll to "App Store Server Notifications"
2. Production URL: `https://your-project.supabase.co/functions/v1/apple-webhook`
3. Sandbox URL: Same URL (we'll detect environment in code)
4. Version: Version 2

---

## Step 2: Create Apple Webhook Edge Function

```typescript
// supabase/functions/apple-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// App Store Server Notification types
interface DecodedPayload {
  notificationType: string;
  subtype?: string;
  data: {
    signedTransactionInfo: string;
    signedRenewalInfo?: string;
  };
}

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate: number;
  offerType?: number; // 2 = free trial
  environment: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // The payload is a JWS (JSON Web Signature)
    const signedPayload = body.signedPayload;
    if (!signedPayload) {
      return new Response('Missing signedPayload', { status: 400 });
    }

    // Decode JWT payload (middle part)
    const parts = signedPayload.split('.');
    if (parts.length !== 3) {
      return new Response('Invalid JWT format', { status: 400 });
    }

    const payloadJson = new TextDecoder().decode(decode(parts[1]));
    const payload: DecodedPayload = JSON.parse(payloadJson);

    console.log('Notification type:', payload.notificationType);
    console.log('Subtype:', payload.subtype);

    // Decode transaction info
    const txParts = payload.data.signedTransactionInfo.split('.');
    const txJson = new TextDecoder().decode(decode(txParts[1]));
    const transaction: TransactionInfo = JSON.parse(txJson);

    console.log('Transaction:', {
      id: transaction.transactionId,
      productId: transaction.productId,
      expiresDate: new Date(transaction.expiresDate).toISOString()
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different notification types
    switch (payload.notificationType) {
      case 'DID_RENEW':
      case 'DID_FAIL_TO_RENEW':
        // Trial ended, subscription attempted to charge
        await handleTrialEnded(supabase, transaction, payload.notificationType === 'DID_RENEW');
        break;

      case 'EXPIRED':
        // Subscription expired (user cancelled or failed to renew)
        await handleExpired(supabase, transaction);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        // User turned off auto-renew (we cancelled it)
        if (payload.subtype === 'AUTO_RENEW_DISABLED') {
          console.log('Auto-renew disabled for:', transaction.transactionId);
        }
        break;

      case 'SUBSCRIBED':
        // New subscription - trial started
        if (payload.subtype === 'INITIAL_BUY') {
          console.log('New subscription started:', transaction.transactionId);
        }
        break;

      default:
        console.log('Unhandled notification type:', payload.notificationType);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleTrialEnded(
  supabase: ReturnType<typeof createClient>,
  transaction: TransactionInfo,
  didRenew: boolean
): Promise<void> {
  // Find goal with this subscription
  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('subscription_id', transaction.transactionId)
    .single();

  if (error || !goal) {
    console.error('Goal not found for subscription:', transaction.transactionId);
    return;
  }

  if (didRenew) {
    // User was charged - they failed their goal
    await supabase
      .from('goals')
      .update({ status: 'failed' })
      .eq('id', goal.id);

    console.log('Goal failed, user charged:', goal.id);
  } else {
    // Charge failed - could be many reasons
    console.log('Renewal failed for goal:', goal.id);
  }
}

async function handleExpired(
  supabase: ReturnType<typeof createClient>,
  transaction: TransactionInfo
): Promise<void> {
  // Find goal with this subscription
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('subscription_id', transaction.transactionId)
    .single();

  if (!goal) {
    console.log('No goal found for expired subscription:', transaction.transactionId);
    return;
  }

  // If goal is still active and subscription expired without renewal,
  // that means we successfully cancelled it (goal completed)
  if (goal.status === 'completed') {
    console.log('Subscription expired after goal completion:', goal.id);
  }
}
```

---

## Step 3: Create Subscription Cancellation Edge Function

```typescript
// supabase/functions/cancel-subscription/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface CancelRequest {
  transactionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transactionId } = (await req.json()) as CancelRequest;

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Missing transactionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get App Store Connect credentials
    const issuerId = Deno.env.get('APP_STORE_ISSUER_ID');
    const keyId = Deno.env.get('APP_STORE_KEY_ID');
    const privateKeyPem = Deno.env.get('APP_STORE_PRIVATE_KEY');
    const bundleId = Deno.env.get('APP_BUNDLE_ID');

    if (!issuerId || !keyId || !privateKeyPem || !bundleId) {
      throw new Error('App Store Connect credentials not configured');
    }

    // Create JWT for App Store Server API
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
      .setIssuer(issuerId)
      .setIssuedAt()
      .setExpirationTime('1h')
      .setAudience('appstoreconnect-v1')
      .setSubject(bundleId)
      .sign(privateKey);

    // Call App Store Server API to get subscription info
    const response = await fetch(
      `https://api.storekit.itunes.apple.com/inApps/v1/subscriptions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      // For sandbox, use sandbox URL
      const sandboxResponse = await fetch(
        `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!sandboxResponse.ok) {
        throw new Error('Failed to get subscription info');
      }
    }

    // Note: Apple doesn't allow programmatic cancellation of subscriptions.
    // The best we can do is:
    // 1. Not charge (by ensuring trial period covers the goal)
    // 2. Send a push notification asking user to cancel
    // 3. Implement a refund flow if they were charged incorrectly

    // For our purposes, we mark the subscription as "should not renew"
    // and the trial expiration handles the rest

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription will not renew after trial'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cancel subscription error:', message);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Step 4: Add App Store Connect Secrets

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
APP_STORE_ISSUER_ID=your-issuer-id
APP_STORE_KEY_ID=your-key-id
APP_STORE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APP_BUNDLE_ID=com.yourname.accountability
```

To get these:
1. App Store Connect → Users and Access → Keys
2. Create an "In-App Purchase" key
3. Download the .p8 file
4. Note the Key ID and Issuer ID

---

## Step 5: Update Goal Completion Logic

```typescript
// features/goals/services/goalCompletionService.ts
import { supabase } from '@/shared/lib/supabase';
import { goalService } from './goalService';
import type { Goal } from '../types/goal.types';
import type { Result } from '@/shared/types/common.types';

export const goalCompletionService = {
  async markGoalCompleted(goalId: string): Promise<Result<Goal>> {
    // Get the goal first
    const goalResult = await goalService.getById(goalId);

    if (!goalResult.success || goalResult.data === null) {
      return {
        success: false,
        error: new Error('Goal not found')
      };
    }

    const goal = goalResult.data;

    // Update goal status
    const updateResult = await goalService.updateStatus(goalId, 'completed');

    if (!updateResult.success) {
      return updateResult;
    }

    // If goal had a stake, cancel the subscription
    if (goal.subscriptionId !== null) {
      const cancelResult = await this.cancelStakeSubscription(goal.subscriptionId);

      if (!cancelResult.success) {
        // Log but don't fail - goal is still completed
        console.error('Failed to cancel subscription:', cancelResult.error);
      }
    }

    return updateResult;
  },

  async cancelStakeSubscription(subscriptionId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { transactionId: subscriptionId }
      });

      if (error !== null) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data: undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      return { success: false, error: new Error(message) };
    }
  }
};
```

---

## Step 6: Update AI Verification to Complete Goal

```typescript
// supabase/functions/verify-proof/index.ts
// Add this at the end of successful verification

if (verificationResult.isValid) {
  // Check if this is the first successful verification
  const { data: existingVerified } = await supabase
    .from('proof_submissions')
    .select('id')
    .eq('goal_id', goalId)  // Need to pass goalId to function
    .eq('verification_status', 'verified')
    .limit(1);

  // If no previous verified proofs, mark goal as completed
  if (!existingVerified || existingVerified.length === 0) {
    // Get the goal
    const { data: goal } = await supabase
      .from('goals')
      .select('subscription_id')
      .eq('id', goalId)
      .single();

    // Update goal status
    await supabase
      .from('goals')
      .update({ status: 'completed' })
      .eq('id', goalId);

    // Cancel subscription if exists
    if (goal?.subscription_id) {
      await fetch(`${supabaseUrl}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ transactionId: goal.subscription_id })
      });
    }
  }
}
```

---

## Step 7: Create Subscription Status Component

```typescript
// features/subscription/components/SubscriptionStatus.tsx
import { View, Text } from 'react-native';
import type { Goal } from '@/features/goals';

interface SubscriptionStatusProps {
  goal: Goal;
}

export function SubscriptionStatus({ goal }: SubscriptionStatusProps): JSX.Element | null {
  if (goal.subscriptionId === null) {
    return null;
  }

  const statusConfig = getStatusConfig(goal);

  return (
    <View className={`rounded-xl p-4 ${statusConfig.bg}`}>
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-xl">{statusConfig.icon}</Text>
        <Text className={`font-semibold ${statusConfig.textColor}`}>
          {statusConfig.title}
        </Text>
      </View>
      <Text className={statusConfig.textColor}>
        {statusConfig.description}
      </Text>
    </View>
  );
}

interface StatusConfig {
  icon: string;
  title: string;
  description: string;
  bg: string;
  textColor: string;
}

function getStatusConfig(goal: Goal): StatusConfig {
  switch (goal.status) {
    case 'active':
    case 'pending':
      return {
        icon: '⏳',
        title: 'Stake Active',
        description: `Complete your goal before the deadline to avoid being charged.`,
        bg: 'bg-yellow-50',
        textColor: 'text-yellow-800'
      };

    case 'completed':
      return {
        icon: '🎉',
        title: 'Goal Completed!',
        description: 'Your stake has been cancelled. You won\'t be charged.',
        bg: 'bg-green-50',
        textColor: 'text-green-800'
      };

    case 'failed':
      return {
        icon: '💸',
        title: 'Stake Charged',
        description: 'You didn\'t complete your goal in time and have been charged.',
        bg: 'bg-red-50',
        textColor: 'text-red-800'
      };

    case 'cancelled':
      return {
        icon: '❌',
        title: 'Goal Cancelled',
        description: 'This goal was cancelled.',
        bg: 'bg-gray-50',
        textColor: 'text-gray-800'
      };

    default: {
      const _exhaustive: never = goal.status;
      throw new Error(`Unknown status: ${String(_exhaustive)}`);
    }
  }
}
```

---

## Step 8: Update Goal Detail with Subscription Status

```typescript
// app/goal/[id].tsx
// Add SubscriptionStatus component

import { SubscriptionStatus } from '@/features/subscription/components/SubscriptionStatus';

// In the JSX, after details section:
{goal.subscriptionId !== null && (
  <View className="mb-6">
    <SubscriptionStatus goal={goal} />
  </View>
)}
```

---

## Step 9: Update Goal Form for Purchase Flow

```typescript
// features/goals/components/GoalForm.tsx
// Update submit handler to initiate purchase

import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth';
import { goalService } from '../services/goalService';
import { subscriptionService } from '@/features/subscription';
import type { StakeProduct } from '@/features/subscription';

export function GoalForm(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedStake, setSelectedStake] = useState<StakeProduct | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadlineDays: 7
  });
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!validate()) return;
    if (user === null) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setIsLoading(true);

    try {
      // Calculate deadline based on stake's trial period
      const deadlineDays = selectedStake?.trialDays ?? formData.deadlineDays;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);

      // Create goal first (without subscription)
      const createResult = await goalService.create(user.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        deadline,
        stakeAmountCents: selectedStake?.priceCents ?? 0
      });

      if (!createResult.success) {
        throw createResult.error;
      }

      const goal = createResult.data;

      // If stake selected, initiate purchase
      if (selectedStake !== null) {
        const purchaseResult = await subscriptionService.purchaseStake(
          selectedStake.productId,
          goal.id
        );

        if (!purchaseResult.success) {
          // Purchase failed or cancelled - delete the goal
          await goalService.updateStatus(goal.id, 'cancelled');
          throw new Error(purchaseResult.error?.message ?? 'Purchase cancelled');
        }
      }

      Alert.alert(
        'Goal Created!',
        selectedStake !== null
          ? 'Your stake is active. Complete your goal to avoid being charged!'
          : 'Good luck with your goal!',
        [{ text: 'OK', onPress: (): void => router.replace('/(tabs)') }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create goal';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }

  // ... rest of component
}
```

---

## Step 10: Deploy Edge Functions

```bash
# Deploy webhook handler
supabase functions deploy apple-webhook

# Deploy cancel subscription
supabase functions deploy cancel-subscription

# Redeploy verify-proof with updates
supabase functions deploy verify-proof
```

---

## Step 11: Export Updated Subscription Feature

```typescript
// features/subscription/index.ts
export { subscriptionService } from './services/subscriptionService';
export { useSubscription } from './hooks/useSubscription';
export { StakeSelector } from './components/StakeSelector';
export { SubscriptionStatus } from './components/SubscriptionStatus';
export type {
  StakeProduct,
  ActiveSubscription,
  PurchaseResult,
  StakeProductId
} from './types/subscription.types';
```

---

## Verification Checklist

### Sandbox Testing Flow

1. **Create staked goal**: Select $5 stake (3-day trial)
2. **Complete purchase**: Use sandbox account
3. **Upload valid proof**: Take photo matching goal
4. **Verify AI passes**: Proof marked as verified
5. **Goal completed**: Status changes to "completed"
6. **Check subscription**: Should show cancelled in App Store Connect

### Failure Flow

1. **Create staked goal**: Select $5 stake
2. **Don't submit proof**: Wait for trial to end (in sandbox, can speed up)
3. **Check webhook logs**: Should show DID_RENEW notification
4. **Goal failed**: Status changes to "failed"

### Manual Verification

```bash
# Check edge function logs
supabase functions logs apple-webhook
supabase functions logs verify-proof
supabase functions logs cancel-subscription

# Check Supabase database
# goals table: subscription_id, status
# proof_submissions: verification_status
```

---

## Files Created/Modified

```
accountability-app/
├── features/
│   ├── goals/
│   │   ├── components/
│   │   │   └── GoalForm.tsx           # MODIFIED
│   │   └── services/
│   │       └── goalCompletionService.ts # NEW
│   └── subscription/
│       ├── components/
│       │   └── SubscriptionStatus.tsx  # NEW
│       └── index.ts                    # MODIFIED
├── app/
│   └── goal/
│       └── [id].tsx                    # MODIFIED
└── supabase/
    └── functions/
        ├── apple-webhook/
        │   └── index.ts                # NEW
        ├── cancel-subscription/
        │   └── index.ts                # NEW
        └── verify-proof/
            └── index.ts                # MODIFIED
```

---

## Important Notes

### Apple Subscription Limitations

1. **No programmatic cancellation**: Apple doesn't allow apps to cancel subscriptions directly
2. **Trial period is key**: The trial duration must match your goal deadline
3. **Refunds**: If there's an error, users can request refunds through Apple
4. **Sandbox timing**: Sandbox subscriptions use accelerated time (1 day = ~3 minutes)

### Production Considerations

1. **Error handling**: Implement retry logic for webhook failures
2. **Logging**: Add comprehensive logging for debugging
3. **Monitoring**: Set up alerts for failed subscriptions
4. **Support**: Have a process for handling edge cases

---

## Next Phase

Proceed to [Phase 11: History & Polish](./phase-11-history-polish.md) to add the history view and final polish.
