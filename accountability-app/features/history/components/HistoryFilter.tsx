import type { JSX } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { GoalStatus } from '@/shared/types/database.types';

type FilterOption = 'all' | GoalStatus;

interface HistoryFilterProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  counts: {
    all: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

interface FilterConfig {
  value: FilterOption;
  label: string;
  activeColor: string;
  textColor: string;
}

const FILTERS: FilterConfig[] = [
  { value: 'all', label: 'All', activeColor: 'bg-gray-800', textColor: 'text-white' },
  { value: 'completed', label: 'Completed', activeColor: 'bg-green-600', textColor: 'text-white' },
  { value: 'failed', label: 'Failed', activeColor: 'bg-red-600', textColor: 'text-white' },
  { value: 'cancelled', label: 'Cancelled', activeColor: 'bg-gray-500', textColor: 'text-white' },
];

export function HistoryFilter({ activeFilter, onFilterChange, counts }: HistoryFilterProps): JSX.Element {
  function getCount(filter: FilterOption): number {
    switch (filter) {
      case 'all':
        return counts.all;
      case 'completed':
        return counts.completed;
      case 'failed':
        return counts.failed;
      case 'cancelled':
        return counts.cancelled;
      default:
        return 0;
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      className="mb-4"
    >
      <View className="flex-row gap-2">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;
          const count = getCount(filter.value);

          return (
            <Pressable
              key={filter.value}
              onPress={(): void => onFilterChange(filter.value)}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                isActive ? filter.activeColor : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-medium ${isActive ? filter.textColor : 'text-gray-700'}`}
              >
                {filter.label}
              </Text>
              <View
                className={`ml-2 px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isActive ? filter.textColor : 'text-gray-600'
                  }`}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
