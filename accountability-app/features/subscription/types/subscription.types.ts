import type { IAPResponseCode } from 'expo-in-app-purchases';

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: Date | null;
  productId: string | null;
}

export interface PurchaseResult {
  success: boolean;
  responseCode: IAPResponseCode;
  errorMessage: string | null;
}

// Product IDs must match App Store Connect configuration
export const SUBSCRIPTION_PRODUCT_IDS = {
  MONTHLY: 'com.accountability.premium.monthly',
  YEARLY: 'com.accountability.premium.yearly',
} as const;

export type SubscriptionProductId =
  (typeof SUBSCRIPTION_PRODUCT_IDS)[keyof typeof SUBSCRIPTION_PRODUCT_IDS];

// Premium features
export const PREMIUM_FEATURES = [
  'Unlimited goals',
  'AI-powered proof verification',
  'Priority support',
  'No ads',
  'Advanced analytics',
] as const;
