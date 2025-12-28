import type { JSX } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

interface GoogleSignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function GoogleSignInButton({
  onPress,
  isLoading = false,
  disabled = false,
}: GoogleSignInButtonProps): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      className={`bg-white border border-gray-300 rounded-lg py-3 px-4 flex-row items-center justify-center ${
        disabled || isLoading ? 'opacity-50' : 'active:bg-gray-50'
      }`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <>
          {/* Google Logo SVG would go here - using text for simplicity */}
          <View className="w-5 h-5 mr-3 items-center justify-center">
            <Text className="text-lg font-bold text-blue-500">G</Text>
          </View>
          <Text className="text-gray-700 font-medium text-base">Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}
