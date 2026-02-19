import { Tabs } from 'expo-router';
import { Home, Film, PlusCircle, User, HelpCircle, Shield } from 'lucide-react-native';
import React from 'react';
import { useApp } from '@/providers/AppProvider';

export default function TabLayout() {
  const { colors, t } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t.videos,
          tabBarIcon: ({ color, size }) => <Film size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: t.publish,
          tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: t.help,
          tabBarIcon: ({ color, size }) => <HelpCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="moderateur"
        options={{
          title: 'Modo',
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
