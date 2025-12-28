import type { JSX } from 'react';
import { View, Text } from 'react-native';

interface HistoryStatsProps {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export function HistoryStats({ total, completed, failed, cancelled }: HistoryStatsProps): JSX.Element {
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View className="bg-white rounded-xl p-4 mx-4 mb-4 shadow-sm">
      {/* Success Rate */}
      <View className="items-center mb-4">
        <Text className="text-4xl font-bold text-gray-900">{successRate}%</Text>
        <Text className="text-gray-600">Success Rate</Text>
      </View>

      {/* Stats Grid */}
      <View className="flex-row justify-around">
        <StatItem label="Completed" value={completed} color="text-green-600" />
        <StatItem label="Failed" value={failed} color="text-red-600" />
        <StatItem label="Cancelled" value={cancelled} color="text-gray-600" />
      </View>
    </View>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  color: string;
}

function StatItem({ label, value, color }: StatItemProps): JSX.Element {
  return (
    <View className="items-center">
      <Text className={`text-2xl font-semibold ${color}`}>{value}</Text>
      <Text className="text-gray-500 text-sm">{label}</Text>
    </View>
  );
}
