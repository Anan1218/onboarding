# Phase 9: Apple Subscription Setup

**Goal:** Set up App Store Connect subscriptions
**Test:** See subscription products in app, can initiate purchase

---

## Prerequisites

- Phase 8 completed
- Apple Developer account ($99/year)
- App Store Connect access

---

## Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. My Apps → "+" → New App
3. Fill in:
   - Platform: iOS
   - Name: Accountability
   - Primary Language: English
   - Bundle ID: Match your app.json `ios.bundleIdentifier`
   - SKU: accountability-app-001

---

## Step 2: Create Subscription Group

In App Store Connect → Your App → Subscriptions:

1. Create Subscription Group: "Accountability Stakes"
2. Reference Name: accountability_stakes

---

## Step 3: Create Subscription Products

Create 4 subscription products in the group:

| Product ID | Display Name | Price | Trial Duration |
|------------|--------------|-------|----------------|
| `stake_5` | $5 Stake | $4.99 | 3 days |
| `stake_10` | $10 Stake | $9.99 | 7 days |
| `stake_20` | $20 Stake | $19.99 | 14 days |
| `stake_50` | $50 Stake | $49.99 | 30 days |

For each product:
1. Reference Name: Same as Product ID
2. Subscription Duration: 1 Month (minimum required)
3. Free Trial: Set duration matching goal deadline options
4. Price: Set in all territories

**Key Concept:** The "trial" is the goal period. If user completes goal, we cancel before trial ends = no charge. If trial ends without completion = user charged.

---

## Step 4: Configure Subscription Metadata

For each subscription, add:

1. **Display Name:** "$X Stake - Accountability"
2. **Description:** "Stake $X on your goal. Complete it to avoid being charged."
3. **Promotional Text:** (optional) "Stay accountable with real stakes"

---

## Step 5: Install React Native IAP

```bash
npm install react-native-iap

# For iOS
cd ios && pod install && cd ..
```

**Note:** react-native-iap requires bare workflow or custom dev client for Expo.

---

## Step 6: Eject to Bare Workflow (if using Expo managed)

If you're using Expo managed workflow, you'll need to prebuild:

```bash
npx expo prebuild

# Or use a custom development build
npx expo install expo-dev-client
npx eas build --profile development --platform ios
```

---

## Step 7: Configure Native iOS

Add to `ios/AccountabilityApp/Info.plist`:

```xml
<key>SKIncludeConsumableInAppPurchaseHistory</key>
<true/>
```

---

## Step 8: Create IAP Types

```typescript
// features/subscription/types/subscription.types.ts
export interface StakeProduct {
  productId: string;
  displayName: string;
  priceString: string;
  priceCents: number;
  trialDays: number;
}

export interface ActiveSubscription {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: Date;
  expiresDate: Date;
  isTrialPeriod: boolean;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export const STAKE_PRODUCT_IDS = [
  'stake_5',
  'stake_10',
  'stake_20',
  'stake_50'
] as const;

export type StakeProductId = typeof STAKE_PRODUCT_IDS[number];

export const STAKE_CONFIGS: Record<StakeProductId, { cents: number; trialDays: number }> = {
  stake_5: { cents: 500, trialDays: 3 },
  stake_10: { cents: 1000, trialDays: 7 },
  stake_20: { cents: 2000, trialDays: 14 },
  stake_50: { cents: 5000, trialDays: 30 }
};
```

---

## Step 9: Create IAP Library

```typescript
// shared/lib/iap.ts
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type SubscriptionPurchase,
  type PurchaseError,
  type Subscription
} from 'react-native-iap';
import { Platform } from 'react-native';
import { STAKE_PRODUCT_IDS } from '@/features/subscription/types/subscription.types';
import type { StakeProduct } from '@/features/subscription/types/subscription.types';

let isInitialized = false;

export const iapService = {
  async initialize(): Promise<boolean> {
    if (isInitialized) return true;

    try {
      await initConnection();
      isInitialized = true;
      return true;
    } catch (error) {
      console.error('IAP init error:', error);
      return false;
    }
  },

  async cleanup(): Promise<void> {
    if (!isInitialized) return;

    try {
      await endConnection();
      isInitialized = false;
    } catch (error) {
      console.error('IAP cleanup error:', error);
    }
  },

  async getProducts(): Promise<StakeProduct[]> {
    if (!isInitialized) {
      await this.initialize();
    }

    try {
      const subscriptions = await getSubscriptions({
        skus: [...STAKE_PRODUCT_IDS]
      });

      return subscriptions.map(mapSubscriptionToProduct);
    } catch (error) {
      console.error('Get products error:', error);
      return [];
    }
  },

  async purchaseSubscription(productId: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    if (!isInitialized) {
      await this.initialize();
    }

    try {
      const purchase = await requestSubscription({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      });

      // Handle the purchase
      if (Array.isArray(purchase) && purchase.length > 0) {
        const p = purchase[0];
        await finishTransaction({ purchase: p, isConsumable: false });

        return {
          success: true,
          transactionId: p.transactionId
        };
      }

      return { success: false, error: 'No purchase returned' };
    } catch (error) {
      const e = error as PurchaseError;
      return {
        success: false,
        error: e.message ?? 'Purchase failed'
      };
    }
  },

  onPurchaseUpdate(callback: (purchase: SubscriptionPurchase) => void): () => void {
    const subscription = purchaseUpdatedListener(callback);
    return (): void => subscription.remove();
  },

  onPurchaseError(callback: (error: PurchaseError) => void): () => void {
    const subscription = purchaseErrorListener(callback);
    return (): void => subscription.remove();
  }
};

function mapSubscriptionToProduct(sub: Subscription): StakeProduct {
  // Extract price in cents
  const priceValue = Platform.OS === 'ios'
    ? parseFloat(sub.price ?? '0')
    : parseFloat(sub.price ?? '0');
  const priceCents = Math.round(priceValue * 100);

  // Get trial days from our config
  const productId = sub.productId as keyof typeof import('@/features/subscription/types/subscription.types').STAKE_CONFIGS;
  const config = {
    stake_5: { trialDays: 3 },
    stake_10: { trialDays: 7 },
    stake_20: { trialDays: 14 },
    stake_50: { trialDays: 30 }
  }[productId] ?? { trialDays: 7 };

  return {
    productId: sub.productId,
    displayName: sub.title ?? sub.productId,
    priceString: sub.localizedPrice ?? `$${priceValue.toFixed(2)}`,
    priceCents,
    trialDays: config.trialDays
  };
}
```

---

## Step 10: Create Subscription Service

```typescript
// features/subscription/services/subscriptionService.ts
import { iapService } from '@/shared/lib/iap';
import { supabase } from '@/shared/lib/supabase';
import type { StakeProduct } from '../types/subscription.types';
import type { Result } from '@/shared/types/common.types';

export const subscriptionService = {
  async getStakeProducts(): Promise<Result<StakeProduct[]>> {
    try {
      const products = await iapService.getProducts();
      return { success: true, data: products };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products';
      return { success: false, error: new Error(message) };
    }
  },

  async purchaseStake(
    productId: string,
    goalId: string
  ): Promise<Result<{ transactionId: string }>> {
    const purchaseResult = await iapService.purchaseSubscription(productId);

    if (!purchaseResult.success || purchaseResult.transactionId === undefined) {
      return {
        success: false,
        error: new Error(purchaseResult.error ?? 'Purchase failed')
      };
    }

    // Update goal with subscription info
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        subscription_id: purchaseResult.transactionId,
        subscription_product_id: productId
      })
      .eq('id', goalId);

    if (updateError !== null) {
      // Purchase succeeded but we failed to link it
      // This is a critical error - log it
      console.error('Failed to link subscription to goal:', updateError);
    }

    return {
      success: true,
      data: { transactionId: purchaseResult.transactionId }
    };
  },

  async cancelSubscription(subscriptionId: string): Promise<Result<void>> {
    // Note: Canceling subscriptions programmatically requires App Store Server API
    // For now, we track intent to cancel and let the trial expire naturally
    // In production, implement App Store Server API integration

    console.log('Cancel subscription intent:', subscriptionId);

    return { success: true, data: undefined };
  }
};
```

---

## Step 11: Create Subscription Hook

```typescript
// features/subscription/hooks/useSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { iapService } from '@/shared/lib/iap';
import type { StakeProduct } from '../types/subscription.types';
import type { Result } from '@/shared/types/common.types';

interface UseSubscriptionReturn {
  products: StakeProduct[];
  isLoading: boolean;
  error: Error | null;
  purchaseStake: (productId: string, goalId: string) => Promise<Result<{ transactionId: string }>>;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [products, setProducts] = useState<StakeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await subscriptionService.getStakeProducts();

    if (result.success) {
      setProducts(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initialize IAP and load products
    async function init(): Promise<void> {
      await iapService.initialize();
      await loadProducts();
    }

    void init();

    return (): void => {
      void iapService.cleanup();
    };
  }, [loadProducts]);

  const purchaseStake = useCallback(
    async (productId: string, goalId: string): Promise<Result<{ transactionId: string }>> => {
      return subscriptionService.purchaseStake(productId, goalId);
    },
    []
  );

  return {
    products,
    isLoading,
    error,
    purchaseStake,
    refresh: loadProducts
  };
}
```

---

## Step 12: Create Stake Selector Component

```typescript
// features/subscription/components/StakeSelector.tsx
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import type { StakeProduct } from '../types/subscription.types';

interface StakeSelectorProps {
  selectedProductId: string | null;
  onSelect: (product: StakeProduct | null) => void;
  disabled?: boolean;
}

export function StakeSelector({
  selectedProductId,
  onSelect,
  disabled = false
}: StakeSelectorProps): JSX.Element {
  const { products, isLoading, error } = useSubscription();

  if (isLoading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#0284c7" />
        <Text className="text-gray-500 mt-2">Loading stake options...</Text>
      </View>
    );
  }

  if (error !== null) {
    return (
      <View className="py-4">
        <Text className="text-red-500 text-center">
          Failed to load stake options. Pull to refresh.
        </Text>
      </View>
    );
  }

  // Add "Free" option at the beginning
  const options: Array<StakeProduct | null> = [null, ...products];

  return (
    <View className="gap-2">
      {options.map((product) => (
        <StakeOption
          key={product?.productId ?? 'free'}
          product={product}
          isSelected={
            product === null
              ? selectedProductId === null
              : selectedProductId === product.productId
          }
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}

      <Text className="text-xs text-gray-500 text-center mt-2">
        Stakes are charged only if you don't complete your goal
      </Text>
    </View>
  );
}

interface StakeOptionProps {
  product: StakeProduct | null;
  isSelected: boolean;
  onSelect: (product: StakeProduct | null) => void;
  disabled: boolean;
}

function StakeOption({
  product,
  isSelected,
  onSelect,
  disabled
}: StakeOptionProps): JSX.Element {
  const isFree = product === null;
  const displayName = isFree ? 'Free' : product.priceString;
  const trialText = isFree ? 'No stake' : `${product.trialDays}-day deadline`;

  return (
    <Pressable
      onPress={(): void => onSelect(product)}
      disabled={disabled}
      className={`p-4 rounded-xl border-2 ${
        isSelected
          ? 'border-primary-600 bg-primary-50'
          : 'border-gray-200 bg-white'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text
            className={`text-lg font-semibold ${
              isSelected ? 'text-primary-700' : 'text-gray-900'
            }`}
          >
            {displayName}
          </Text>
          <Text className="text-sm text-gray-500">{trialText}</Text>
        </View>

        <View
          className={`w-6 h-6 rounded-full border-2 ${
            isSelected
              ? 'border-primary-600 bg-primary-600'
              : 'border-gray-300 bg-white'
          } items-center justify-center`}
        >
          {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
        </View>
      </View>
    </Pressable>
  );
}
```

---

## Step 13: Update Goal Form to Use Real Products

```typescript
// features/goals/components/GoalForm.tsx
// Replace the hardcoded stake options with StakeSelector

import { StakeSelector } from '@/features/subscription/components/StakeSelector';
import type { StakeProduct } from '@/features/subscription';

// In the component:
const [selectedStake, setSelectedStake] = useState<StakeProduct | null>(null);

function handleStakeSelect(product: StakeProduct | null): void {
  setSelectedStake(product);
  updateFormData({
    stakeAmountCents: product?.priceCents ?? 0,
    stakeProductId: product?.productId ?? null
  });
}

// In the JSX:
<View>
  <Text className="text-sm font-medium text-gray-700 mb-2">Stake Amount</Text>
  <StakeSelector
    selectedProductId={selectedStake?.productId ?? null}
    onSelect={handleStakeSelect}
  />
</View>
```

---

## Step 14: Export Subscription Feature

```typescript
// features/subscription/index.ts
export { subscriptionService } from './services/subscriptionService';
export { useSubscription } from './hooks/useSubscription';
export { StakeSelector } from './components/StakeSelector';
export type {
  StakeProduct,
  ActiveSubscription,
  PurchaseResult,
  StakeProductId,
  STAKE_PRODUCT_IDS,
  STAKE_CONFIGS
} from './types/subscription.types';
```

---

## Verification Checklist

### Sandbox Testing Setup

1. In App Store Connect → Users and Access → Sandbox Testers
2. Create a sandbox test account
3. On test device: Settings → App Store → Sign out
4. Sign in with sandbox account when prompted during purchase

### Manual Testing

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. Build development client
npx eas build --profile development --platform ios

# 4. Install on device and test
```

1. **Open Create Goal**: Navigate to Create tab
2. **See stake options**: Should load from App Store (may take a few seconds)
3. **Select stake**: Tap a stake option, see it selected
4. **Create goal with stake**: Fill form, select $5 stake, submit
5. **Purchase flow**: Should open Apple purchase sheet
6. **Complete purchase**: Use sandbox account
7. **Goal created**: Verify goal has subscription_id in Supabase

---

## Files Created/Modified

```
accountability-app/
├── shared/
│   └── lib/
│       └── iap.ts                    # NEW
├── features/
│   ├── subscription/
│   │   ├── components/
│   │   │   └── StakeSelector.tsx     # NEW
│   │   ├── hooks/
│   │   │   └── useSubscription.ts    # NEW
│   │   ├── services/
│   │   │   └── subscriptionService.ts # NEW
│   │   ├── types/
│   │   │   └── subscription.types.ts # NEW
│   │   └── index.ts                  # NEW
│   └── goals/
│       └── components/
│           └── GoalForm.tsx          # MODIFIED
└── ios/
    └── AccountabilityApp/
        └── Info.plist                # MODIFIED
```

---

## App Store Connect Checklist

- [ ] App created
- [ ] Subscription group created
- [ ] 4 subscription products created ($5, $10, $20, $50)
- [ ] Trial periods configured
- [ ] Sandbox tester account created
- [ ] Products approved (may take 24-48 hours initially)

---

## Next Phase

Proceed to [Phase 10: Apple Trial Flow](./phase-10-apple-trial-flow.md) to implement the complete stake/trial logic.
