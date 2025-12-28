import type { JSX } from 'react';
import { View, Text } from 'react-native';
import type { VerificationResult as VerificationResultType } from '../types/proof.types';

interface VerificationResultProps {
  result: VerificationResultType;
}

export function VerificationResult({ result }: VerificationResultProps): JSX.Element {
  const isValid = result.isValid;
  const bgColor = isValid ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isValid ? 'border-green-200' : 'border-red-200';
  const iconBg = isValid ? 'bg-green-100' : 'bg-red-100';
  const iconText = isValid ? 'text-green-600' : 'text-red-600';
  const titleColor = isValid ? 'text-green-800' : 'text-red-800';

  return (
    <View className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-3">
        <View className={`w-10 h-10 ${iconBg} rounded-full items-center justify-center`}>
          <Text className={`text-xl ${iconText}`}>{isValid ? '✓' : '✗'}</Text>
        </View>
        <View className="flex-1">
          <Text className={`font-semibold text-lg ${titleColor}`}>
            {isValid ? 'Verified!' : 'Not Verified'}
          </Text>
          <Text className="text-gray-500 text-sm">Confidence: {result.confidence}%</Text>
        </View>
      </View>

      {/* Reasoning */}
      <View className="bg-white rounded-lg p-3">
        <Text className="text-gray-700">{result.reasoning}</Text>
      </View>
    </View>
  );
}
