import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const { colors, textScale } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.leafDecor}>
        <Leaf size={64} color={colors.primary} />
      </View>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.title, { color: colors.text, fontSize: 18 * textScale }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary, fontSize: 14 * textScale }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  leafDecor: {
    position: 'absolute',
    right: 20,
    top: 20,
    opacity: 0.06,
    transform: [{ rotate: '25deg' }],
  },
  iconWrap: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontWeight: '600' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
