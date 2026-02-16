import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, LogOut, Clock, AlertTriangle, Eye, EyeOff, ChevronLeft, Leaf, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { PublicationCard } from '@/components/PublicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Publication, Report } from '@/types';
import { timeAgo } from '@/utils/timeAgo';

const REASON_LABELS: Record<string, string> = {
  fake_news: 'Fake News / Désinformation',
  insults: 'Insultes / Harcèlement',
  nudity: 'Nudité / Contenu explicite',
  ai_content: 'Contenu généré par IA',
  other: 'Autre',
};

export default function ModeratorScreen() {
  const router = useRouter();
  const {
    isModerator, loginModerator, logoutModerator,
    pendingPublications, reports, approvePublication, rejectPublication,
    colors, t,
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = useCallback(() => {
    const success = loginModerator(username, password);
    if (!success) {
      setLoginError(t.wrongCredentials);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setLoginError('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [username, password, loginModerator, t]);

  const handleLogout = useCallback(() => {
    logoutModerator();
    setUsername('');
    setPassword('');
    router.back();
  }, [logoutModerator, router]);

  const handleApprove = useCallback((id: string) => {
    approvePublication(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.approvedAlert, t.approvedAlertMsg);
  }, [approvePublication, t]);

  const handleReject = useCallback((id: string) => {
    rejectPublication(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.rejectedAlert, t.rejectedAlertMsg);
  }, [rejectPublication, t]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (!isModerator) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.loginHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.loginHeaderTitle, { color: colors.text }]}>{t.moderatorSpace}</Text>
          <View style={styles.closePlaceholder} />
        </View>

        <View style={styles.loginContainer}>
          <View style={styles.loginDecor} pointerEvents="none">
            <Leaf size={120} color={colors.primary} />
          </View>
          <View style={[styles.loginIconWrap, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <Shield size={48} color={colors.primary} />
          </View>
          <Text style={[styles.loginTitle, { color: colors.text }]}>{t.modLogin}</Text>
          <Text style={[styles.loginSub, { color: colors.textSecondary }]}>{t.modLoginSub}</Text>

          {loginError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.identifier}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t.enterIdentifier}
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              testID="moderator-username"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t.password}</Text>
            <View style={[styles.passwordWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder={t.enterPassword}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                testID="moderator-password"
              />
              <Pressable
                onPress={() => setShowPassword(prev => !prev)}
                hitSlop={8}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }, (!username || !password) && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={!username || !password}
            testID="moderator-login"
          >
            <Text style={[styles.loginBtnText, { color: colors.background }]}>{t.connect}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.dashHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.dashGreeting, { color: colors.text }]}>{t.helloJules}</Text>
          <Text style={[styles.dashSub, { color: colors.textSecondary }]}>{t.moderationPanel}</Text>
        </View>
        <Pressable style={[styles.logoutBtn, { backgroundColor: colors.dangerLight }]} onPress={handleLogout}>
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>{t.disconnect}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.dashScroll}>
        <View style={styles.statsBar}>
          <View style={[styles.statCard, { backgroundColor: colors.pendingLight, borderColor: colors.border }]}>
            <Clock size={22} color={colors.pending} />
            <Text style={[styles.statNum, { color: colors.pending }]}>{pendingPublications.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{t.pending}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.dangerLight, borderColor: colors.border }]}>
            <AlertTriangle size={22} color={colors.danger} />
            <Text style={[styles.statNum, { color: colors.danger }]}>{reports.length}</Text>
            <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{t.recentReports}</Text>
          </View>
        </View>

        <Text style={[styles.dashSection, { color: colors.text }]}>{t.pendingPublications}</Text>
        {pendingPublications.length === 0 ? (
          <EmptyState
            icon={<Clock size={40} color={colors.textMuted} />}
            title={t.noPendingPubs}
            message={t.noPendingPubsMsg}
          />
        ) : (
          pendingPublications.map((pub: Publication) => (
            <PublicationCard
              key={pub.id}
              publication={pub}
              showStatus
              showModeratorActions
              showReportButton={false}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}

        {reports.length > 0 ? (
          <View>
            <Text style={[styles.dashSection, { color: colors.text }]}>{t.recentReports}</Text>
            {reports.map((report: Report) => (
              <View key={report.id} style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reportHeader}>
                  <AlertTriangle size={16} color={colors.danger} />
                  <Text style={[styles.reportReason, { color: colors.text }]}>
                    {REASON_LABELS[report.reason] || report.reason}
                  </Text>
                  <Text style={[styles.reportTime, { color: colors.textMuted }]}>{timeAgo(report.createdAt)}</Text>
                </View>
                {report.description ? (
                  <Text style={[styles.reportDesc, { color: colors.textSecondary }]}>{report.description}</Text>
                ) : null}
                <Text style={[styles.reportPubId, { color: colors.textMuted }]}>{t.publicationLabel}: {report.publicationId}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginHeader: {
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
  loginHeaderTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  closePlaceholder: {
    width: 32,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  loginDecor: {
    position: 'absolute',
    right: -20,
    top: 20,
    opacity: 0.04,
    transform: [{ rotate: '-30deg' }],
  },
  loginIconWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 6,
  },
  loginSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnDisabled: {
    opacity: 0.4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dashGreeting: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  dashSub: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dashScroll: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  statLbl: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  dashSection: {
    fontSize: 18,
    fontWeight: '700' as const,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  reportCard: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  reportReason: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  reportTime: {
    fontSize: 11,
  },
  reportDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  reportPubId: {
    fontSize: 11,
  },
  bottomSpacer: {
    height: 40,
  },
});
