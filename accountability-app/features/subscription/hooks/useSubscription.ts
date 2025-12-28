import { useState, useEffect, useCallback } from 'react';
import * as InAppPurchases from 'expo-in-app-purchases';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '@/features/auth';
import type {
  SubscriptionStatus,
  SubscriptionProduct,
  PurchaseResult,
} from '../types/subscription.types';
import type { Result } from '@/shared/types/common.types';

interface UseSubscriptionReturn {
  status: SubscriptionStatus | null;
  products: SubscriptionProduct[];
  isLoading: boolean;
  isPurchasing: boolean;
  error: Error | null;
  purchase: (productId: string) => Promise<Result<PurchaseResult>>;
  restore: () => Promise<Result<boolean>>;
  refresh: () => Promise<void>;
}

// Type guard for purchase listener payload
interface PurchaseListenerPayload {
  responseCode: number;
  results?: Array<{
    productId: string;
    transactionId?: string;
    transactionReceipt?: string;
  }>;
}

function isValidPurchasePayload(payload: unknown): payload is PurchaseListenerPayload {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  return 'responseCode' in payload && typeof payload.responseCode === 'number';
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStatus = useCallback(async (): Promise<void> => {
    if (user === null) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    const result = await subscriptionService.getSubscriptionStatus(user.id);
    if (result.success) {
      setStatus(result.data);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [user]);

  const loadProducts = useCallback(async (): Promise<void> => {
    const result = await subscriptionService.getProducts();
    if (result.success) {
      setProducts(result.data);
    }
  }, []);

  // Initialize IAP and load data
  useEffect(() => {
    const initializeIAP = async (): Promise<void> => {
      await subscriptionService.connect();
      await Promise.all([loadStatus(), loadProducts()]);
    };

    void initializeIAP();

    return () => {
      void subscriptionService.disconnect();
    };
  }, [loadStatus, loadProducts]);

  // Set up purchase listener
  useEffect(() => {
    if (user === null) {
      return;
    }

    const userId = user.id;

    const purchaseListener = async (result: unknown): Promise<void> => {
      if (!isValidPurchasePayload(result)) {
        setIsPurchasing(false);
        return;
      }

      if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
        // Process the purchase
        const processResult = await subscriptionService.processPurchase(result, userId);
        if (processResult.success) {
          setStatus(processResult.data);
        } else {
          setError(processResult.error);
        }
      } else if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        // User cancelled - not an error
      } else {
        setError(new Error(`Purchase failed with code: ${result.responseCode}`));
      }

      setIsPurchasing(false);
    };

    InAppPurchases.setPurchaseListener(purchaseListener);

    return () => {
      // Note: expo-in-app-purchases doesn't have a removePurchaseListener
      // The listener is replaced on next setPurchaseListener call
    };
  }, [user]);

  const purchase = useCallback(
    async (productId: string): Promise<Result<PurchaseResult>> => {
      setIsPurchasing(true);
      setError(null);

      const result = await subscriptionService.purchaseSubscription(productId);
      if (!result.success) {
        setIsPurchasing(false);
        setError(result.error);
      }

      return result;
    },
    []
  );

  const restore = useCallback(async (): Promise<Result<boolean>> => {
    setIsLoading(true);
    setError(null);

    const result = await subscriptionService.restorePurchases();
    if (result.success && result.data) {
      // Reload status after restore
      await loadStatus();
    } else if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
    return result;
  }, [loadStatus]);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await loadStatus();
    setIsLoading(false);
  }, [loadStatus]);

  return {
    status,
    products,
    isLoading,
    isPurchasing,
    error,
    purchase,
    restore,
    refresh,
  };
}
