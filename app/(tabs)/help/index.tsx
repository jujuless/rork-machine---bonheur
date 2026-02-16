import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Shield, BookOpen, MessageCircle, RefreshCw, Leaf, Sparkles } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';

export default function HelpScreen() {
  const router = useRouter();
  const { resetData, colors, t, textScale } = useApp();

  const handleOpenModerator = useCallback(() => {
    router.push('/moderator' as any);
  }, [router]);

  const handleReset = useCallback(() => {
    Alert.alert(
      t.resetTitle,
      t.resetMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.resetTitle,
          style: 'destructive',
          onPress: () => {
            resetData();
            Alert.alert(t.resetDone, t.resetDoneMsg);
          },
        },
      ]
    );
  }, [resetData, t]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroSection, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
        <View style={styles.heroLeafBg} pointerEvents="none">
          <Leaf size={100} color={`${colors.primary}20`} />
        </View>
        <View style={styles.heroSparkle} pointerEvents="none">
          <Sparkles size={30} color={`${colors.accent}25`} />
        </View>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Heart size={32} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.primary, fontSize: 24 * textScale }]}>
          Machine à Bonheur
        </Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary, fontSize: 13 * textScale }]}>
          {t.aboutText.substring(0, 80)}...
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <BookOpen size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 17 * textScale }]}>{t.aboutTitle}</Text>
        </View>
        <Text style={[styles.sectionText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
          {t.aboutText}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 17 * textScale }]}>{t.communityRules}</Text>
        </View>
        <View style={styles.rulesList}>
          {[t.rule1, t.rule2, t.rule3, t.rule4, t.rule5, t.rule6].map((rule, idx) => (
            <View key={idx} style={styles.ruleItem}>
              <View style={[styles.ruleDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.ruleText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>{rule}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <MessageCircle size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 17 * textScale }]}>{t.faq}</Text>
        </View>
        {[
          { q: t.faq1Q, a: t.faq1A },
          { q: t.faq2Q, a: t.faq2A },
          { q: t.faq3Q, a: t.faq3A },
          { q: t.faq4Q, a: t.faq4A },
        ].map((item, idx) => (
          <View key={idx} style={styles.faqItem}>
            <Text style={[styles.faqQ, { color: colors.text, fontSize: 14 * textScale }]}>{item.q}</Text>
            <Text style={[styles.faqA, { color: colors.textSecondary, fontSize: 13 * textScale }]}>{item.a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <Pressable style={[styles.modButton, { backgroundColor: colors.primary }]} onPress={handleOpenModerator} testID="open-moderator">
          <Shield size={20} color={colors.background} />
          <Text style={[styles.modButtonText, { color: colors.background }]}>{t.moderatorSpace}</Text>
        </Pressable>

        <Pressable style={[styles.resetButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleReset} testID="reset-data">
          <RefreshCw size={18} color={colors.textSecondary} />
          <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>{t.resetDemo}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Leaf size={18} color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{t.versionLabel}</Text>
        <Text style={[styles.footerSub, { color: colors.textMuted }]}>{t.madeWith}</Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroLeafBg: {
    position: 'absolute',
    right: -10,
    top: -15,
    transform: [{ rotate: '-20deg' }],
  },
  heroSparkle: {
    position: 'absolute',
    left: 20,
    bottom: 15,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  heroTitle: {
    fontWeight: '800' as const,
  },
  heroSub: {
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700' as const,
  },
  sectionText: {
    lineHeight: 21,
  },
  rulesList: {
    gap: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  ruleText: {
    lineHeight: 20,
    flex: 1,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQ: {
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  faqA: {
    lineHeight: 19,
  },
  actionsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  modButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  modButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  footerSub: {
    fontSize: 12,
  },
  bottomSpacer: {
    height: 40,
  },
});
