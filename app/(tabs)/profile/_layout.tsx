import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { useApp } from '@/providers/AppProvider';

export default function ProfileLayout() {
  const { colors, t } = useApp();
  const router = useRouter();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerShadowVisible: false,
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen
        name="index"
        options={{
          title: t.myProfile,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700' as const,
            fontSize: 18,
          },
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings' as any)}
              hitSlop={12}
              style={{ padding: 8 }}
              testID="open-settings"
            >
              <Settings size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
