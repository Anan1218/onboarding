import type { JSX } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Button } from '@/shared/components/Button';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { SUBSCRIPTION_PRODUCT_IDS, PREMIUM_FEATURES } from '../types/subscription.types';

interface PaywallProps {
  onClose?: () => void;
}

export function Paywall({ onClose }: PaywallProps): JSX.Element {
  const { products, isLoading, isPurchasing, purchase, restore } = useSubscriptionContext();

  const monthlyProduct = products.find((p) => p.productId === SUBSCRIPTION_PRODUCT_IDS.MONTHLY);
  const yearlyProduct = products.find((p) => p.productId === SUBSCRIPTION_PRODUCT_IDS.YEARLY);

  async function handlePurchase(productId: string): Promise<void> {
    const result = await purchase(productId);
    if (!result.success) {
      Alert.alert('Purchase Failed', result.error.message);
    }
  }

  async function handleRestore(): Promise<void> {
    const result = await restore();
    if (result.success) {
      if (result.data) {
        Alert.alert('Restored', 'Your subscription has been restored.');
        onClose?.();
      } else {
        Alert.alert('No Subscription', 'No previous subscription found to restore.');
      }
    } else {
      Alert.alert('Error', result.error.message);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-6">
      {/* Header */}
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Go Premium</Text>
        <Text className="text-gray-600 text-center">
          Unlock all features and achieve your goals faster
        </Text>
      </View>

      {/* Features list */}
      <View className="bg-gray-50 rounded-xl p-4 mb-8">
        {PREMIUM_FEATURES.map((feature, index) => (
          <View key={index} className="flex-row items-center py-2">
            <Text className="text-green-500 mr-3">✓</Text>
            <Text className="text-gray-700">{feature}</Text>
          </View>
        ))}
      </View>

      {/* Subscription options */}
      <View className="gap-4 mb-6">
        {yearlyProduct !== undefined && (
          <View className="bg-sky-50 border-2 border-sky-600 rounded-xl p-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-semibold text-gray-900">{yearlyProduct.title}</Text>
              <View className="bg-sky-600 px-2 py-1 rounded">
                <Text className="text-white text-xs font-medium">BEST VALUE</Text>
              </View>
            </View>
            <Text className="text-gray-600 mb-3">{yearlyProduct.price}/year</Text>
            <Button
              title={isPurchasing ? 'Processing...' : 'Subscribe Yearly'}
              onPress={(): void => void handlePurchase(yearlyProduct.productId)}
              disabled={isPurchasing}
            />
          </View>
        )}

        {monthlyProduct !== undefined && (
          <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-1">{monthlyProduct.title}</Text>
            <Text className="text-gray-600 mb-3">{monthlyProduct.price}/month</Text>
            <Button
              title={isPurchasing ? 'Processing...' : 'Subscribe Monthly'}
              onPress={(): void => void handlePurchase(monthlyProduct.productId)}
              variant="secondary"
              disabled={isPurchasing}
            />
          </View>
        )}

        {products.length === 0 && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <Text className="text-yellow-800 text-center">
              Subscription products not available. Please try again later.
            </Text>
          </View>
        )}
      </View>

      {/* Restore purchases */}
      <View className="items-center">
        <Text
          className="text-sky-600 underline"
          onPress={(): void => void handleRestore()}
        >
          Restore Purchases
        </Text>
      </View>

      {/* Terms */}
      <View className="mt-auto pt-6">
        <Text className="text-xs text-gray-400 text-center">
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of
          the current period. You can manage your subscription in your Apple ID settings.
        </Text>
      </View>
    </View>
  );
}
