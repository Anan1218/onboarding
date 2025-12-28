import type { JSX } from 'react';
import { TextInput, View, Text } from 'react-native';
import { useState } from 'react';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  autoComplete?: 'email' | 'password' | 'username' | 'off';
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
  autoComplete = 'off',
  multiline = false,
  numberOfLines = 1,
}: InputProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = error !== undefined && error !== '';

  function getBorderColor(): string {
    if (hasError) return 'border-red-500';
    if (isFocused) return 'border-primary-500';
    return 'border-gray-300';
  }

  return (
    <View className="w-full">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={(): void => setIsFocused(true)}
        onBlur={(): void => setIsFocused(false)}
        className={`w-full px-4 py-3 border rounded-lg text-base text-gray-900 bg-white ${getBorderColor()}`}
        placeholderTextColor="#9CA3AF"
        style={multiline ? { textAlignVertical: 'top', minHeight: numberOfLines * 24 } : undefined}
      />
      {hasError && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
