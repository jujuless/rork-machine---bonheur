import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Globe, Palette, Type, Leaf, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { AppSettings } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, colors, t, textScale } = useApp();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleLanguage = useCallback((lang: AppSettings['language']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ language: lang });
  }, [updateSettings]);

  const handleTheme = useCallback((theme: AppSettings['theme']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ theme });
  }, [updateSettings]);

  const handleTextSize = useCallback((size: AppSettings['textSize']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ textSize: size });
  }, [updateSettings]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 17 * textScale }]}>{t.settings}</Text>
        <View style={styles.closePlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.decorLeaf} pointerEvents="none">
          <Leaf size={100} color={colors.primary} style={{ opacity: 0.04 }} />
        </View>
        <View style={styles.decorSparkle} pointerEvents="none">
          <Sparkles size={40} color={colors.accent} style={{ opacity: 0.03 }} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * textScale }]}>{t.language}</Text>
          </View>
          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.optionBtn,
                {
                  backgroundColor: settings.language === 'fr' ? colors.primaryLight : colors.surfaceLight,
                  borderColor: settings.language === 'fr' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleLanguage('fr')}
              testID="lang-fr"
            >
              <Text style={[styles.optionEmoji]}>🇫🇷</Text>
              <Text style={[styles.optionText, { color: settings.language === 'fr' ? colors.primary : colors.text }]}>Français</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionBtn,
                {
                  backgroundColor: settings.language === 'en' ? colors.primaryLight : colors.surfaceLight,
                  borderColor: settings.language === 'en' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleLanguage('en')}
              testID="lang-en"
            >
              <Text style={[styles.optionEmoji]}>🇬🇧</Text>
              <Text style={[styles.optionText, { color: settings.language === 'en' ? colors.primary : colors.text }]}>English</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * textScale }]}>{t.theme}</Text>
          </View>
          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.optionBtn,
                {
                  backgroundColor: settings.theme === 'dark' ? colors.primaryLight : colors.surfaceLight,
                  borderColor: settings.theme === 'dark' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleTheme('dark')}
              testID="theme-dark"
            >
              <Text style={[styles.optionEmoji]}>🌙</Text>
              <Text style={[styles.optionText, { color: settings.theme === 'dark' ? colors.primary : colors.text }]}>{t.dark}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionBtn,
                {
                  backgroundColor: settings.theme === 'light' ? colors.primaryLight : colors.surfaceLight,
                  borderColor: settings.theme === 'light' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleTheme('light')}
              testID="theme-light"
            >
              <Text style={[styles.optionEmoji]}>☀️</Text>
              <Text style={[styles.optionText, { color: settings.theme === 'light' ? colors.primary : colors.text }]}>{t.light}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 * textScale }]}>{t.textSize}</Text>
          </View>
          <View style={styles.optionRow}>
            {(['small', 'medium', 'large'] as const).map((size) => {
              const labels = { small: t.small, medium: t.medium, large: t.large };
              const isActive = settings.textSize === size;
              return (
                <Pressable
                  key={size}
                  style={[
                    styles.sizeBtn,
                    {
                      backgroundColor: isActive ? colors.primaryLight : colors.surfaceLight,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleTextSize(size)}
                  testID={`text-size-${size}`}
                >
                  <Text style={[
                    styles.sizeBtnText,
                    {
                      color: isActive ? colors.primary : colors.text,
                      fontSize: size === 'small' ? 13 : size === 'large' ? 17 : 15,
                    },
                  ]}>
                    {labels[size]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
            {settings.language === 'fr' ? 'Aperçu' : 'Preview'}
          </Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: colors.text, fontSize: 18 * textScale }]}>
              Machine à Bonheur
            </Text>
            <Text style={[styles.previewText, { color: colors.textSecondary, fontSize: 14 * textScale }]}>
              {t.positiveSpace}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Leaf size={18} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{t.versionLabel}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600' as const,
  },
  closePlaceholder: {
    width: 32,
  },
  scrollContent: {
    padding: 20,
  },
  decorLeaf: {
    position: 'absolute',
    right: -10,
    top: 20,
    transform: [{ rotate: '-25deg' }],
  },
  decorSparkle: {
    position: 'absolute',
    left: 15,
    top: 300,
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700' as const,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sizeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sizeBtnText: {
    fontWeight: '600' as const,
  },
  previewSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontWeight: '700' as const,
  },
  previewText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  bottomSpacer: {
    height: 20,
  },
});
