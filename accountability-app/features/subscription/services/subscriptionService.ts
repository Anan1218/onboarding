import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '@/shared/lib/supabase';
import type { Result } from '@/shared/types/common.types';
import type { DbUserSubscription } from '@/shared/types/database.types';
import {
  SUBSCRIPTION_PRODUCT_IDS,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type PurchaseResult,
} from '../types/subscription.types';

// Type guard for IAPItemDetails
interface IAPItemDetails {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

function isValidIAPItem(item: unknown): item is IAPItemDetails {
  if (item === null || typeof item !== 'object') {
    return false;
  }
  return (
    'productId' in item &&
    typeof item.productId === 'string' &&
    'title' in item &&
    typeof item.title === 'string' &&
    'description' in item &&
    typeof item.description === 'string' &&
    'price' in item &&
    typeof item.price === 'string' &&
    'priceAmountMicros' in item &&
    typeof item.priceAmountMicros === 'number' &&
    'priceCurrencyCode' in item &&
    typeof item.priceCurrencyCode === 'string'
  );
}

// Type guard for subscription data from Supabase
function isValidDbSubscription(data: unknown): data is DbUserSubscription {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'tier' in data &&
    typeof data.tier === 'string' &&
    'has_used_trial' in data &&
    typeof data.has_used_trial === 'boolean'
  );
}

// Type guard for purchase result
interface IAPPurchaseResult {
  responseCode: number;
  results?: Array<{
    productId: string;
    transactionId?: string;
    transactionReceipt?: string;
    purchaseTime?: number;
    originalTransactionId?: string;
  }>;
}

function isValidPurchaseResult(result: unknown): result is IAPPurchaseResult {
  if (result === null || typeof result !== 'object') {
    return false;
  }
  return 'responseCode' in result && typeof result.responseCode === 'number';
}

let isConnected = false;

export const subscriptionService = {
  async connect(): Promise<Result<boolean>> {
    if (isConnected) {
      return { success: true, data: true };
    }

    try {
      await InAppPurchases.connectAsync();
      isConnected = true;
      return { success: true, data: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to App Store';
      return { success: false, error: new Error(message) };
    }
  },

  async disconnect(): Promise<void> {
    if (isConnected) {
      await InAppPurchases.disconnectAsync();
      isConnected = false;
    }
  },

  async getProducts(): Promise<Result<SubscriptionProduct[]>> {
    const connectionResult = await this.connect();
    if (!connectionResult.success) {
      return { success: false, error: connectionResult.error };
    }

    try {
      const productIds = Object.values(SUBSCRIPTION_PRODUCT_IDS);
      const response = await InAppPurchases.getProductsAsync(productIds);

      const products: SubscriptionProduct[] = [];
      const results = response.results ?? [];
      for (const item of results) {
        if (isValidIAPItem(item)) {
          products.push({
            productId: item.productId,
            title: item.title,
            description: item.description,
            price: item.price,
            priceAmountMicros: item.priceAmountMicros,
            priceCurrencyCode: item.priceCurrencyCode,
          });
        }
      }

      return { success: true, data: products };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get products';
      return { success: false, error: new Error(message) };
    }
  },

  async purchaseSubscription(productId: string): Promise<Result<PurchaseResult>> {
    const connectionResult = await this.connect();
    if (!connectionResult.success) {
      return { success: false, error: connectionResult.error };
    }

    try {
      await InAppPurchases.purchaseItemAsync(productId);

      // The actual purchase result comes via the listener
      // For now, return a pending state
      return {
        success: true,
        data: {
          success: true,
          responseCode: InAppPurchases.IAPResponseCode.OK,
          errorMessage: null,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      return {
        success: false,
        error: new Error(message),
      };
    }
  },

  async processPurchase(
    purchase: IAPPurchaseResult,
    userId: string
  ): Promise<Result<SubscriptionStatus>> {
    if (!isValidPurchaseResult(purchase)) {
      return { success: false, error: new Error('Invalid purchase data') };
    }

    if (purchase.responseCode !== InAppPurchases.IAPResponseCode.OK) {
      return {
        success: false,
        error: new Error(`Purchase failed with code: ${purchase.responseCode}`),
      };
    }

    const purchaseDetails = purchase.results?.[0];
    if (purchaseDetails === undefined) {
      return { success: false, error: new Error('No purchase details found') };
    }

    // Calculate expiration (1 month for monthly, 1 year for yearly)
    const isYearly = purchaseDetails.productId === SUBSCRIPTION_PRODUCT_IDS.YEARLY;
    const expiresAt = new Date();
    if (isYearly) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update Supabase
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        tier: 'premium',
        product_id: purchaseDetails.productId,
        original_transaction_id: purchaseDetails.originalTransactionId ?? null,
        latest_receipt: purchaseDetails.transactionReceipt ?? null,
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbSubscription(data)) {
      return { success: false, error: new Error('Invalid subscription data received') };
    }

    // Finish the transaction - we've already recorded the purchase in our database
    // The purchase listener in the hook will handle finishing the transaction
    // via the InAppPurchase object it receives

    return {
      success: true,
      data: {
        tier: 'premium',
        isActive: true,
        expiresAt,
        productId: purchaseDetails.productId,
      },
    };
  },

  async restorePurchases(): Promise<Result<boolean>> {
    const connectionResult = await this.connect();
    if (!connectionResult.success) {
      return { success: false, error: connectionResult.error };
    }

    try {
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      const results = history.results ?? [];

      if (results.length === 0) {
        return { success: true, data: false };
      }

      // Check for any valid subscription
      const hasValidSubscription = results.some((purchase) => {
        const productId = purchase.productId;
        return (
          productId === SUBSCRIPTION_PRODUCT_IDS.MONTHLY ||
          productId === SUBSCRIPTION_PRODUCT_IDS.YEARLY
        );
      });

      return { success: true, data: hasValidSubscription };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore purchases';
      return { success: false, error: new Error(message) };
    }
  },

  async getSubscriptionStatus(userId: string): Promise<Result<SubscriptionStatus>> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error !== null) {
      // No subscription record - return free tier
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            tier: 'free',
            isActive: false,
            expiresAt: null,
            productId: null,
          },
        };
      }
      return { success: false, error: new Error(error.message) };
    }

    if (!isValidDbSubscription(data)) {
      return { success: false, error: new Error('Invalid subscription data') };
    }

    // Check if premium subscription is still active
    const isActive =
      data.tier === 'premium' &&
      data.expires_at !== null &&
      new Date(data.expires_at) > new Date();

    return {
      success: true,
      data: {
        tier: isActive ? 'premium' : 'free',
        isActive,
        expiresAt: data.expires_at !== null ? new Date(data.expires_at) : null,
        productId: data.product_id,
      },
    };
  },

  async hasUsedTrial(userId: string): Promise<Result<boolean>> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('has_used_trial')
      .eq('user_id', userId)
      .single();

    if (error !== null) {
      if (error.code === 'PGRST116') {
        return { success: true, data: false };
      }
      return { success: false, error: new Error(error.message) };
    }

    if (data === null || typeof data !== 'object' || !('has_used_trial' in data)) {
      return { success: true, data: false };
    }

    return { success: true, data: Boolean(data.has_used_trial) };
  },
};
