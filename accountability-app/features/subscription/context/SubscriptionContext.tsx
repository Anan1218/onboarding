import type { JSX, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import type { SubscriptionStatus, SubscriptionProduct, PurchaseResult } from '../types/subscription.types';
import type { Result } from '@/shared/types/common.types';

interface SubscriptionContextType {
  status: SubscriptionStatus | null;
  products: SubscriptionProduct[];
  isLoading: boolean;
  isPurchasing: boolean;
  error: Error | null;
  isPremium: boolean;
  purchase: (productId: string) => Promise<Result<PurchaseResult>>;
  restore: () => Promise<Result<boolean>>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps): JSX.Element {
  const subscription = useSubscription();

  const isPremium = subscription.status?.tier === 'premium' && subscription.status.isActive;

  const value: SubscriptionContextType = {
    ...subscription,
    isPremium,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionContext(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === null) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
