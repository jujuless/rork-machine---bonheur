import { Stack } from 'expo-router';
import React from 'react';
import { useApp } from '@/providers/AppProvider';

export default function HelpLayout() {
  const { colors, t } = useApp();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerShadowVisible: false,
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen
        name="index"
        options={{
          title: t.help,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700' as const,
            fontSize: 18,
          },
        }}
      />
    </Stack>
  );
}
