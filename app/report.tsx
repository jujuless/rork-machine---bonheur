import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Flag, ChevronLeft, Send, Leaf } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { ReportReason } from '@/types';

const REASONS: ReportReason[] = ['fake_news', 'insults', 'nudity', 'ai_content', 'other'];

export default function ReportScreen() {
  const router = useRouter();
  const { publicationId } = useLocalSearchParams<{ publicationId: string }>();
  const { reportPublication, colors, t } = useApp();

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const reasonLabels: Record<ReportReason, string> = {
    fake_news: t.fakeNews,
    insults: t.insults,
    nudity: t.nudity,
    ai_content: t.aiContent,
    other: t.otherReason,
  };

  const handleSubmit = useCallback(() => {
    if (!selectedReason) {
      Alert.alert(t.reasonRequired, t.reasonRequiredMsg);
      return;
    }
    if (!publicationId) {
      Alert.alert(t.error, t.publicationNotFound);
      return;
    }
    reportPublication(publicationId, selectedReason, description.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      t.reportSent,
      t.reportSentMsg,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [selectedReason, description, publicationId, reportPublication, router, t]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.reportTitle}</Text>
        <View style={styles.closePlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.decorLeaf} pointerEvents="none">
          <Leaf size={80} color={colors.primary} />
        </View>
        <View style={[styles.iconWrap, { backgroundColor: colors.dangerLight }]}>
          <Flag size={32} color={colors.danger} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t.reportQuestion}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.reportSub}</Text>

        <View style={styles.reasonsList}>
          {REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={[
                styles.reasonItem,
                {
                  backgroundColor: selectedReason === reason ? colors.primaryLight : colors.surface,
                  borderColor: selectedReason === reason ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setSelectedReason(reason);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              testID={`reason-${reason}`}
            >
              <View style={[
                styles.radioOuter,
                { borderColor: selectedReason === reason ? colors.primary : colors.textMuted },
              ]}>
                {selectedReason === reason ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
              </View>
              <Text style={[
                styles.reasonText,
                { color: selectedReason === reason ? colors.primary : colors.text },
              ]}>
                {reasonLabels[reason]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.descLabel, { color: colors.text }]}>{t.additionalDetails}</Text>
        <TextInput
          style={[styles.descInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder={t.describeProblem}
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300}
        />

        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.danger }, !selectedReason && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason}
          testID="submit-report"
        >
          <Send size={18} color={colors.white} />
          <Text style={styles.submitBtnText}>{t.sendReport}</Text>
        </Pressable>
      </View>
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
    fontSize: 17,
    fontWeight: '600' as const,
  },
  closePlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  decorLeaf: {
    position: 'absolute',
    right: 10,
    top: 10,
    opacity: 0.04,
    transform: [{ rotate: '-25deg' }],
  },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 24,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  descLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  descInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    lineHeight: 20,
    marginBottom: 24,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
