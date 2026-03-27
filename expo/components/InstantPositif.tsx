import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { Leaf, Sparkles, X } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { getRandomQuote } from '@/mocks/quotes';

const { width, height } = Dimensions.get('window');

export function InstantPositif() {
  const { colors, t, dismissInstantPositif, textScale } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const breatheAnim = useRef(new Animated.Value(0.4)).current;
  const quote = useMemo(() => getRandomQuote(), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0.4, duration: 4000, useNativeDriver: true }),
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, [fadeAnim, scaleAnim, breatheAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      dismissInstantPositif();
    });
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: colors.background }]}>
      <Pressable style={styles.closeBtn} onPress={handleDismiss} hitSlop={16}>
        <X size={24} color={colors.textMuted} />
      </Pressable>

      <Animated.View style={[styles.breatheCircle, {
        opacity: breatheAnim,
        transform: [{ scale: breatheAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.8, 1.2] }) }],
        backgroundColor: colors.glow,
        borderColor: colors.primary,
      }]} />

      <View style={styles.decorTopRight} pointerEvents="none">
        <Leaf size={120} color={colors.primary} style={{ opacity: 0.06 }} />
      </View>
      <View style={styles.decorBottomLeft} pointerEvents="none">
        <Sparkles size={60} color={colors.accent} style={{ opacity: 0.05 }} />
      </View>

      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Leaf size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.primary, fontSize: 18 * textScale }]}>
          {t.instantPositifTitle}
        </Text>

        <Text style={[styles.quote, { color: colors.text, fontSize: 22 * textScale }]}>
          « {quote.text} »
        </Text>
        <Text style={[styles.author, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
          — {quote.author}
        </Text>

        <Pressable
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={handleDismiss}
          testID="instant-positif-dismiss"
        >
          <Text style={[styles.startBtnText, { color: colors.background }]}>{t.startDay}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  breatheCircle: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 1,
  },
  decorTopRight: {
    position: 'absolute',
    right: -20,
    top: 80,
    transform: [{ rotate: '-25deg' }],
  },
  decorBottomLeft: {
    position: 'absolute',
    left: 20,
    bottom: 100,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  title: {
    fontWeight: '600' as const,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  quote: {
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  author: {
    marginBottom: 40,
  },
  startBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
