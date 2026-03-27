import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '@/providers/AppProvider';

function HeaderTitle() {
  const { colors } = useApp();
  return (
    <View style={styles.headerTitle}>
      <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
      <Text style={[styles.headerText, { color: colors.primary }]}>Seranova</Text>
    </View>
  );
}

export default function HomeLayout() {
  const { colors } = useApp();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerShadowVisible: false,
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <HeaderTitle />,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
});
