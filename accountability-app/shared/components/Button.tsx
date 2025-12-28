import type { JSX } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;

  const baseClasses = 'px-6 py-3 rounded-lg items-center justify-center';

  function getVariantClasses(): string {
    if (isDisabled) {
      switch (variant) {
        case 'primary':
          return 'bg-primary-300';
        case 'secondary':
          return 'bg-gray-200';
        case 'danger':
          return 'bg-red-300';
      }
    }

    switch (variant) {
      case 'primary':
        return 'bg-primary-600 active:bg-primary-700';
      case 'secondary':
        return 'bg-gray-100 active:bg-gray-200';
      case 'danger':
        return 'bg-red-600 active:bg-red-700';
    }
  }

  function getTextClasses(): string {
    switch (variant) {
      case 'primary':
        return 'text-white font-semibold text-base';
      case 'secondary':
        return 'text-gray-900 font-semibold text-base';
      case 'danger':
        return 'text-white font-semibold text-base';
    }
  }

  function getSpinnerColor(): string {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#fff';
      case 'secondary':
        return '#374151';
    }
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseClasses} ${getVariantClasses()}`}
    >
      {loading ? (
        <ActivityIndicator color={getSpinnerColor()} />
      ) : (
        <Text className={getTextClasses()}>{title}</Text>
      )}
    </Pressable>
  );
}
