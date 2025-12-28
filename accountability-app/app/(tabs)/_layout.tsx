import type { JSX } from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

interface TabIconProps {
  label: string;
  focused: boolean;
}

function TabIcon({ label, focused }: TabIconProps): JSX.Element {
  return (
    <View className="items-center justify-center">
      <Text className={focused ? 'text-primary-600 font-bold text-xs' : 'text-gray-500 text-xs'}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }): JSX.Element => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }): JSX.Element => <TabIcon label="➕" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }): JSX.Element => <TabIcon label="📜" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }): JSX.Element => <TabIcon label="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
