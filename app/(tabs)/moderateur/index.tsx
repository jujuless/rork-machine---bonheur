import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, LogOut, Clock, AlertTriangle, Eye, EyeOff, Leaf,
  Crown, Bot, Plus, Trash2, Key, Users, X, Check,
  ZoomIn, ExternalLink, ShieldAlert, ShieldCheck, ShieldOff,
  ClipboardList, History, UserPlus, Send, Ban,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { PublicationCard } from '@/components/PublicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Publication, Report, ModeratorRole, ModeratorPermission, ModeratorAccount, ModerationTask, ModerationLog } from '@/types';
import { timeAgo } from '@/utils/timeAgo';
import { CATEGORY_LABELS, DANGER_LEVEL_CONFIG } from '@/utils/contentFilter';
import type { ToxicityCategory } from '@/utils/contentFilter';

const REASON_LABELS: Record<string, string> = {
  fake_news: 'Fake News / Désinformation',
  insults: 'Insultes / Harcèlement',
  nudity: 'Nudité / Contenu explicite',
  ai_content: 'Signalé par l\'IA',
  other: 'Autre',
};

const ROLE_CONFIG: Record<ModeratorRole, { label: string; color: string; bg: string; desc: string }> = {
  ultime: { label: 'Modérateur Ultime', color: '#F59E0B', bg: '#2D2206', desc: 'Accès complet + gestion des comptes' },
  standard: { label: 'Modérateur', color: '#4ADE80', bg: '#122A1B', desc: 'Signalements utilisateurs & IA' },
  ia_validator: { label: 'Modérateur IA', color: '#818CF8', bg: '#1E1B4B', desc: 'Validation des contenus pré-approuvés IA' },
};

const PERMISSION_CONFIG: Record<ModeratorPermission, { label: string; color: string }> = {
  view: { label: 'Voir', color: '#60A5FA' },
  approve: { label: 'Approuver', color: '#4ADE80' },
  reject: { label: 'Refuser', color: '#EF4444' },
  comment: { label: 'Commenter', color: '#FBBF24' },
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#FBBF24', bg: '#231A04', Icon: Clock },
  approved: { label: 'Approuvé', color: '#4ADE80', bg: '#052E16', Icon: ShieldCheck },
  rejected: { label: 'Refusé', color: '#EF4444', bg: '#2A0808', Icon: ShieldOff },
  reported: { label: 'Signalé', color: '#FB923C', bg: '#2A1000', Icon: ShieldAlert },
};

const LOG_ACTION_CONFIG: Record<ModerationLog['action'], { label: string; color: string }> = {
  approved: { label: 'Approuvé', color: '#4ADE80' },
  rejected: { label: 'Refusé', color: '#EF4444' },
  assigned: { label: 'Assigné', color: '#60A5FA' },
  account_created: { label: 'Compte créé', color: '#F59E0B' },
  account_revoked: { label: 'Accès révoqué', color: '#FB923C' },
  commented: { label: 'Commentaire', color: '#A78BFA' },
};

type DashTab = 'pending' | 'reports' | 'ai' | 'mytasks' | 'assign' | 'accounts' | 'logs';

export default function ModerateurTab() {
  const {
    isModerator, moderatorRole, currentModeratorId, currentModeratorLabel, currentModeratorPermissions,
    loginModerator, logoutModerator,
    pendingPublications, reports, approvePublication, rejectPublication,
    moderatorDeletePublication,
    aiFlaggedPublications, aiValidatedPublications,
    allModeratorAccounts, moderatorAccounts,
    moderationTasks, myAssignedTasks, moderationLogs,
    createModeratorAccount, revokeModeratorAccess, deleteModeratorAccount,
    assignPublicationToModerator, submitModerationDecision,
    publications,
    colors, t,
  } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<DashTab>('pending');

  // Account creation form
  const [accIdentifier, setAccIdentifier] = useState('');
  const [accCode, setAccCode] = useState('');
  const [accLabel, setAccLabel] = useState('');
  const [accRole, setAccRole] = useState<ModeratorRole>('standard');
  const [accPerms, setAccPerms] = useState<ModeratorPermission[]>(['view', 'approve', 'reject', 'comment']);
  const [accError, setAccError] = useState('');
  const [accSuccess, setAccSuccess] = useState('');

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetPubId, setAssignTargetPubId] = useState('');
  const [assignTargetModId, setAssignTargetModId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Decision modal (delegated view)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionTaskId, setDecisionTaskId] = useState('');
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionComment, setDecisionComment] = useState('');

  // Image zoom
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleLogin = useCallback(() => {
    if (!identifier.trim()) {
      setLoginError('Veuillez entrer votre identifiant');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const success = loginModerator(identifier.trim(), code);
    if (!success) {
      setLoginError('Identifiant ou code incorrect');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setLoginError('');
      setIdentifier('');
      setCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [identifier, code, loginModerator]);

  const handleLogout = useCallback(() => {
    logoutModerator();
    setIdentifier('');
    setCode('');
    setActiveTab('pending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [logoutModerator]);

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

  const handleDeleteReportedPost = useCallback((publicationId: string) => {
    Alert.alert(
      'Supprimer la publication',
      'Supprimer définitivement cette publication et son signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: () => {
            moderatorDeletePublication(publicationId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [moderatorDeletePublication]);

  const handleCreateAccount = useCallback(() => {
    setAccError('');
    const result = createModeratorAccount({
      identifier: accIdentifier,
      code: accCode,
      role: accRole,
      permissions: accPerms,
      label: accLabel,
    });
    if (!result.ok) {
      setAccError(result.error ?? 'Erreur inconnue');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccIdentifier('');
    setAccCode('');
    setAccLabel('');
    setAccRole('standard');
    setAccPerms(['view', 'approve', 'reject', 'comment']);
    setAccSuccess(`Compte "${accLabel}" créé avec succès !`);
    setTimeout(() => setAccSuccess(''), 4000);
  }, [createModeratorAccount, accIdentifier, accCode, accRole, accPerms, accLabel]);

  const handleRevokeAccount = useCallback((account: ModeratorAccount) => {
    Alert.alert(
      'Révoquer l\'accès',
      `Révoquer l'accès de "${account.label}" (${account.identifier}) ? Ce compte ne pourra plus se connecter.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer', style: 'destructive',
          onPress: () => {
            revokeModeratorAccess(account.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [revokeModeratorAccess]);

  const handleDeleteAccount = useCallback((account: ModeratorAccount) => {
    Alert.alert(
      'Supprimer le compte',
      `Supprimer définitivement "${account.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: () => {
            deleteModeratorAccount(account.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [deleteModeratorAccount]);

  const handleOpenAssign = useCallback((pubId: string) => {
    setAssignTargetPubId(pubId);
    setAssignTargetModId('');
    setAssignSuccess('');
    setShowAssignModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleConfirmAssign = useCallback(() => {
    if (!assignTargetModId) return;
    const ok = assignPublicationToModerator(assignTargetPubId, assignTargetModId);
    if (!ok) {
      Alert.alert('Erreur', 'Impossible d\'assigner cette publication (déjà assignée ou modérateur invalide).');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const modName = allModeratorAccounts.find(a => a.id === assignTargetModId)?.label ?? '';
    setAssignSuccess(`Assigné à "${modName}" ✓`);
    setTimeout(() => {
      setShowAssignModal(false);
      setAssignSuccess('');
    }, 1500);
  }, [assignTargetPubId, assignTargetModId, assignPublicationToModerator, allModeratorAccounts]);

  const handleOpenDecision = useCallback((taskId: string, type: 'approved' | 'rejected') => {
    setDecisionTaskId(taskId);
    setDecisionType(type);
    setDecisionComment('');
    setShowDecisionModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleConfirmDecision = useCallback(() => {
    submitModerationDecision(decisionTaskId, decisionType, decisionComment);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDecisionModal(false);
    Alert.alert(
      decisionType === 'approved' ? '✓ Approuvé' : '✗ Refusé',
      'Votre décision a été enregistrée.'
    );
  }, [decisionTaskId, decisionType, decisionComment, submitModerationDecision]);

  const togglePermission = useCallback((perm: ModeratorPermission) => {
    setAccPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  }, []);

  // Assignable moderators: non-revoked, non-ultime, all roles
  const assignableModerators = useMemo(
    () => allModeratorAccounts.filter(a => !a.isRevoked && a.role !== 'ultime'),
    [allModeratorAccounts]
  );

  if (!isModerator || !moderatorRole) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loginContainer}>
          <View style={styles.loginDecor} pointerEvents="none">
            <Leaf size={180} color={colors.primary} />
          </View>
          <View style={[styles.loginIconWrap, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <Shield size={48} color={colors.primary} />
          </View>
          <Text style={[styles.loginTitle, { color: colors.text }]}>Espace Modo</Text>
          <Text style={[styles.loginSub, { color: colors.textSecondary }]}>
            Connectez-vous pour accéder à l'espace modération
          </Text>

          {loginError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Identifiant</Text>
            <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="Votre identifiant"
                placeholderTextColor={colors.textMuted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                testID="moderator-identifier"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Code d'accès</Text>
            <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="Entrez votre code"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={setCode}
                secureTextEntry={!showCode}
                autoCapitalize="none"
                autoCorrect={false}
                testID="moderator-code"
              />
              <Pressable onPress={() => setShowCode(prev => !prev)} hitSlop={8} style={styles.eyeBtn}>
                {showCode ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }, (!code || !identifier.trim()) && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={!code || !identifier.trim()}
            testID="moderator-login"
          >
            <Text style={[styles.loginBtnText, { color: colors.background }]}>Accéder</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const roleCfg = ROLE_CONFIG[moderatorRole];
  const isUltime = moderatorRole === 'ultime';
  const isIaValidator = moderatorRole === 'ia_validator';
  const canApprove = isUltime || currentModeratorPermissions.includes('approve');
  const canReject = isUltime || currentModeratorPermissions.includes('reject');
  const canComment = isUltime || currentModeratorPermissions.includes('comment');

  const allTabs: { key: DashTab; label: string; count: number; show: boolean }[] = [
    { key: 'mytasks', label: 'Mes tâches', count: myAssignedTasks.length, show: !isUltime },
    { key: 'pending', label: isIaValidator ? 'Pré-validées' : 'En attente', count: isIaValidator ? aiValidatedPublications.length : pendingPublications.length, show: true },
    { key: 'reports', label: 'Signalements', count: reports.length, show: !isIaValidator },
    { key: 'ai', label: 'Toxicité IA', count: aiFlaggedPublications.length, show: isUltime || isIaValidator },
    { key: 'assign', label: 'Assigner', count: 0, show: isUltime },
    { key: 'accounts', label: 'Comptes', count: moderatorAccounts.filter(a => !a.isRevoked).length, show: isUltime },
    { key: 'logs', label: 'Logs', count: 0, show: isUltime },
  ];
  const tabs = allTabs.filter(tab => tab.show);
  const validActiveTab = tabs.find(tb => tb.key === activeTab) ? activeTab : tabs[0]?.key ?? 'pending';
  const pendingList = isIaValidator ? aiValidatedPublications : pendingPublications;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.dashHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.dashHeaderLeft}>
          <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg }]}>
            {isUltime ? <Crown size={14} color={roleCfg.color} /> : isIaValidator ? <Bot size={14} color={roleCfg.color} /> : <Shield size={14} color={roleCfg.color} />}
            <Text style={[styles.roleBadgeText, { color: roleCfg.color }]}>
              {isUltime ? '"Modérateur Ultime"' : roleCfg.label}
            </Text>
          </View>
          <Text style={[styles.dashSub, { color: colors.textSecondary }]}>{currentModeratorLabel} · {roleCfg.desc}</Text>
        </View>
        <Pressable style={[styles.logoutBtn, { backgroundColor: colors.dangerLight }]} onPress={handleLogout}>
          <LogOut size={16} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Quitter</Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {tabs.map(tab => {
          const active = validActiveTab === tab.key;
          const activeColor = isUltime ? '#F59E0B' : colors.primary;
          return (
            <Pressable key={tab.key} style={[styles.tabBtn, active && { borderBottomColor: activeColor, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabLabel, { color: active ? activeColor : colors.textMuted }]}>{tab.label}</Text>
              {tab.count > 0 ? (
                <View style={[styles.tabCount, { backgroundColor: active ? activeColor : colors.surface }]}>
                  <Text style={[styles.tabCountText, { color: active ? colors.background : colors.textMuted }]}>{tab.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.dashScroll}>

        {/* ── MES TÂCHES (delegated) ─────────────────── */}
        {validActiveTab === 'mytasks' && !isUltime && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes publications assignées</Text>
            {myAssignedTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={40} color={colors.textMuted} />}
                title="Aucune tâche assignée"
                message="Le modérateur principal vous assignera des publications à examiner."
              />
            ) : (
              myAssignedTasks.map((task: ModerationTask) => {
                const pub = publications.find(p => p.id === task.publicationId);
                if (!pub) return null;
                const aiScore = pub.aiAnalysis?.score;
                return (
                  <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.taskMeta}>
                      <View style={[styles.taskAssignedBy, { backgroundColor: '#1E2A3A' }]}>
                        <Users size={11} color="#60A5FA" />
                        <Text style={styles.taskAssignedByText}>Assigné par {task.assignedByLabel}</Text>
                      </View>
                      <Text style={[styles.taskDate, { color: colors.textMuted }]}>{timeAgo(task.assignedAt)}</Text>
                    </View>

                    {aiScore !== undefined && (
                      <View style={[styles.aiScoreChip, {
                        backgroundColor: aiScore >= 70 ? '#3A0000' : aiScore >= 45 ? '#2A1000' : aiScore >= 20 ? '#231A04' : '#052E16',
                        marginBottom: 8,
                        alignSelf: 'flex-start',
                      }]}>
                        <Bot size={11} color={aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80'} />
                        <Text style={[styles.aiScoreChipText, { color: aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80' }]}>
                          Nocivité {aiScore}/100
                        </Text>
                      </View>
                    )}

                    {pub.text ? (
                      <Text style={[styles.taskPubText, { color: colors.textSecondary }]} numberOfLines={3}>{pub.text}</Text>
                    ) : null}

                    {pub.imageUrl ? (
                      <Pressable style={[styles.taskImageWrap, { borderColor: colors.border }]} onPress={() => { setZoomedImage(pub.imageUrl!); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Image source={{ uri: pub.imageUrl }} style={styles.taskImage} contentFit="cover" transition={200} />
                        <View style={styles.reportImageOverlay}><ZoomIn size={18} color="#fff" /></View>
                      </Pressable>
                    ) : null}

                    <View style={styles.taskActions}>
                      {canApprove && (
                        <Pressable style={[styles.taskApproveBtn, { backgroundColor: colors.successLight }]} onPress={() => handleOpenDecision(task.id, 'approved')}>
                          <Check size={14} color={colors.success} />
                          <Text style={[styles.taskActionText, { color: colors.success }]}>Approuver</Text>
                        </Pressable>
                      )}
                      {canReject && (
                        <Pressable style={[styles.taskRejectBtn, { backgroundColor: colors.dangerLight }]} onPress={() => handleOpenDecision(task.id, 'rejected')}>
                          <X size={14} color={colors.danger} />
                          <Text style={[styles.taskActionText, { color: colors.danger }]}>Refuser</Text>
                        </Pressable>
                      )}
                      {!canApprove && !canReject && canComment && (
                        <Text style={[styles.noPermText, { color: colors.textMuted }]}>Droits : commentaire uniquement</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── EN ATTENTE ─────────────────────────────── */}
        {validActiveTab === 'pending' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isIaValidator ? 'Publications pré-validées IA' : 'Publications en attente'}
            </Text>
            {isIaValidator && (
              <View style={[styles.infoBanner, { backgroundColor: '#1E1B4B', borderColor: '#4338CA' }]}>
                <Bot size={14} color="#818CF8" />
                <Text style={[styles.infoBannerText, { color: '#818CF8' }]}>Ces publications n'ont aucun contenu toxique détecté par l'IA.</Text>
              </View>
            )}
            {pendingList.length === 0 ? (
              <EmptyState icon={<Clock size={40} color={colors.textMuted} />} title={t.noPendingPubs} message={t.noPendingPubsMsg} />
            ) : (
              pendingList.map((pub: Publication) => (
                <PublicationCard key={pub.id} publication={pub} showStatus showModeratorActions showReportButton={false} onApprove={handleApprove} onReject={handleReject} />
              ))
            )}
          </View>
        )}

        {/* ── SIGNALEMENTS ───────────────────────────── */}
        {validActiveTab === 'reports' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Signalements</Text>
            {reports.length === 0 ? (
              <EmptyState icon={<AlertTriangle size={40} color={colors.textMuted} />} title="Aucun signalement" message="Aucun contenu n'a été signalé pour le moment." />
            ) : (
              reports.map((report: Report) => {
                const reportedPub = publications.find(p => p.id === report.publicationId);
                const pubStatus = reportedPub?.status ?? 'pending';
                const statusCfg = STATUS_CONFIG[pubStatus] ?? STATUS_CONFIG.pending;
                const aiScore = reportedPub?.aiAnalysis?.score;
                const aiCategories = reportedPub?.aiAnalysis?.categories ?? [];
                return (
                  <View key={report.id} style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.reportHeader}>
                      <View style={[styles.reportIconWrap, { backgroundColor: colors.dangerLight }]}>
                        <AlertTriangle size={14} color={colors.danger} />
                      </View>
                      <Text style={[styles.reportReason, { color: colors.text }]}>{REASON_LABELS[report.reason] || report.reason}</Text>
                      <Text style={[styles.reportTime, { color: colors.textMuted }]}>{timeAgo(report.createdAt)}</Text>
                    </View>

                    {report.description ? (
                      <Text style={[styles.reportDesc, { color: colors.textSecondary }]}>{report.description}</Text>
                    ) : null}

                    {reportedPub ? (
                      <View style={styles.reportPubSection}>
                        <View style={styles.reportPubStatusRow}>
                          <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                            <statusCfg.Icon size={11} color={statusCfg.color} />
                            <Text style={[styles.statusChipText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                          </View>
                          {aiScore !== undefined && (
                            <View style={[styles.aiScoreChip, { backgroundColor: aiScore >= 70 ? '#3A0000' : aiScore >= 45 ? '#2A1000' : aiScore >= 20 ? '#231A04' : '#052E16' }]}>
                              <Bot size={11} color={aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80'} />
                              <Text style={[styles.aiScoreChipText, { color: aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80' }]}>
                                Nocivité {aiScore}/100
                              </Text>
                            </View>
                          )}
                        </View>

                        {aiCategories.length > 0 && (
                          <View style={styles.categoryRow}>
                            {aiCategories.map((cat: ToxicityCategory) => {
                              const catCfg = CATEGORY_LABELS[cat];
                              return (
                                <View key={cat} style={[styles.categoryChip, { backgroundColor: catCfg.bg }]}>
                                  <Text style={[styles.categoryChipText, { color: catCfg.color }]}>{catCfg.label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {reportedPub.text ? (
                          <Text style={[styles.reportPubPreview, { color: colors.textSecondary }]} numberOfLines={2}>{reportedPub.text}</Text>
                        ) : null}

                        {reportedPub.imageUrl ? (
                          <View style={styles.reportImageContainer}>
                            <Pressable style={[styles.reportImageWrap, { borderColor: colors.border }]} onPress={() => { setZoomedImage(reportedPub.imageUrl!); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                              <Image source={{ uri: reportedPub.imageUrl }} style={styles.reportImage} contentFit="cover" transition={200} />
                              <View style={styles.reportImageOverlay}><ZoomIn size={20} color="#fff" /></View>
                            </Pressable>
                            <View style={[styles.imageSourceRow, { backgroundColor: colors.surfaceLight }]}>
                              <ExternalLink size={11} color={colors.textMuted} />
                              <Text style={[styles.imageSourceText, { color: colors.textMuted }]} numberOfLines={1}>{reportedPub.imageUrl.slice(0, 48)}…</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={[styles.reportPubPreview, { color: colors.textMuted, fontStyle: 'italic' }]}>Publication introuvable (supprimée)</Text>
                    )}

                    <View style={styles.reportActions}>
                      <Text style={[styles.reportPubId, { color: colors.textMuted }]}>ID: {report.publicationId.slice(-8)}</Text>
                      <View style={styles.reportActionBtns}>
                        {reportedPub && reportedPub.status === 'pending' && (
                          <>
                            <Pressable style={[styles.approveBtn, { backgroundColor: colors.successLight }]} onPress={() => handleApprove(report.publicationId)} hitSlop={8}>
                              <Check size={13} color={colors.success} />
                              <Text style={[styles.approveBtnText, { color: colors.success }]}>Approuver</Text>
                            </Pressable>
                            <Pressable style={[styles.rejectBtn, { backgroundColor: colors.dangerLight }]} onPress={() => handleReject(report.publicationId)} hitSlop={8}>
                              <X size={13} color={colors.danger} />
                              <Text style={[styles.rejectBtnText, { color: colors.danger }]}>Refuser</Text>
                            </Pressable>
                          </>
                        )}
                        <Pressable style={[styles.deleteReportBtn, { backgroundColor: '#3A0000' }]} onPress={() => handleDeleteReportedPost(report.publicationId)} hitSlop={8}>
                          <Trash2 size={14} color="#EF4444" />
                          <Text style={[styles.deleteReportBtnText, { color: '#EF4444' }]}>Supprimer</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── TOXICITÉ IA ────────────────────────────── */}
        {validActiveTab === 'ai' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contenus toxiques détectés</Text>
            <View style={[styles.infoBanner, { backgroundColor: '#2D1B4E', borderColor: '#7C3AED' }]}>
              <Bot size={14} color="#A78BFA" />
              <Text style={[styles.infoBannerText, { color: '#A78BFA' }]}>Score nocivité ≥ 40/100. Révision manuelle requise.</Text>
            </View>
            {aiFlaggedPublications.length === 0 ? (
              <EmptyState icon={<Bot size={40} color={colors.textMuted} />} title="Aucun contenu toxique" message="L'IA n'a détecté aucun contenu problématique." />
            ) : (
              aiFlaggedPublications.map((pub: Publication) => {
                const dangerCfg = pub.aiAnalysis ? DANGER_LEVEL_CONFIG[pub.aiAnalysis.dangerLevel] : null;
                return (
                  <View key={pub.id}>
                    {dangerCfg && pub.aiAnalysis && (
                      <View style={[styles.toxicityBanner, { backgroundColor: dangerCfg.bg, borderColor: dangerCfg.color + '50' }]}>
                        <View style={styles.toxicityBannerLeft}>
                          <Text style={[styles.toxicityScore, { color: dangerCfg.color }]}>{pub.aiAnalysis.score}/100</Text>
                          <View style={[styles.toxicityLevelChip, { backgroundColor: dangerCfg.color + '20' }]}>
                            <Text style={[styles.toxicityLevelText, { color: dangerCfg.color }]}>Niveau {dangerCfg.label}</Text>
                          </View>
                        </View>
                        <View style={styles.toxicityCats}>
                          {pub.aiAnalysis.categories.map((cat: ToxicityCategory) => {
                            const catCfg = CATEGORY_LABELS[cat];
                            return (
                              <View key={cat} style={[styles.categoryChip, { backgroundColor: catCfg.bg }]}>
                                <Text style={[styles.categoryChipText, { color: catCfg.color }]}>{catCfg.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                    <PublicationCard publication={pub} showStatus showModeratorActions showReportButton={false} onApprove={handleApprove} onReject={handleReject} />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── ASSIGNER ───────────────────────────────── */}
        {validActiveTab === 'assign' && isUltime && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigner des publications</Text>
            <View style={[styles.infoBanner, { backgroundColor: '#1E2A3A', borderColor: '#3B82F6' }]}>
              <ClipboardList size={14} color="#60A5FA" />
              <Text style={[styles.infoBannerText, { color: '#60A5FA' }]}>
                Sélectionnez une publication en attente et assignez-la à un modérateur pour qu'il la examine.
              </Text>
            </View>

            {assignableModerators.length === 0 ? (
              <View style={[styles.noModsBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Users size={28} color={colors.textMuted} />
                <Text style={[styles.noModsText, { color: colors.textSecondary }]}>
                  Aucun modérateur disponible. Créez d'abord des comptes dans l'onglet Comptes.
                </Text>
              </View>
            ) : (
              <>
                {pendingPublications.length === 0 && aiFlaggedPublications.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={40} color={colors.textMuted} />} title="Aucune publication" message="Aucune publication en attente à assigner." />
                ) : (
                  [...pendingPublications, ...aiFlaggedPublications.filter(p => p.status === 'pending')].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).map((pub: Publication) => {
                    const taskCount = moderationTasks.filter(t => t.publicationId === pub.id && t.status === 'pending').length;
                    const aiScore = pub.aiAnalysis?.score;
                    return (
                      <View key={pub.id} style={[styles.assignCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.assignCardTop}>
                          {aiScore !== undefined && (
                            <View style={[styles.aiScoreChip, { backgroundColor: aiScore >= 70 ? '#3A0000' : aiScore >= 45 ? '#2A1000' : aiScore >= 20 ? '#231A04' : '#052E16' }]}>
                              <Bot size={10} color={aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80'} />
                              <Text style={[styles.aiScoreChipText, { color: aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80' }]}>
                                {aiScore}/100
                              </Text>
                            </View>
                          )}
                          {taskCount > 0 && (
                            <View style={[styles.assignedBadge, { backgroundColor: '#1E2A3A' }]}>
                              <Users size={10} color="#60A5FA" />
                              <Text style={styles.assignedBadgeText}>{taskCount} assigné{taskCount > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          <Text style={[styles.assignCardTime, { color: colors.textMuted }]}>{timeAgo(pub.createdAt)}</Text>
                        </View>

                        {pub.text ? (
                          <Text style={[styles.assignCardText, { color: colors.text }]} numberOfLines={2}>{pub.text}</Text>
                        ) : null}

                        {pub.imageUrl ? (
                          <Pressable onPress={() => { setZoomedImage(pub.imageUrl!); }}>
                            <Image source={{ uri: pub.imageUrl }} style={[styles.assignThumb, { borderColor: colors.border }]} contentFit="cover" />
                          </Pressable>
                        ) : null}

                        <Pressable style={[styles.assignBtn, { backgroundColor: '#1E2A3A', borderColor: '#3B82F6' }]} onPress={() => handleOpenAssign(pub.id)}>
                          <Send size={14} color="#60A5FA" />
                          <Text style={styles.assignBtnText}>Assigner à un modérateur</Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
        )}

        {/* ── COMPTES ────────────────────────────────── */}
        {validActiveTab === 'accounts' && isUltime && (
          <View style={styles.accountsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Comptes modérateurs</Text>

            {/* Create form */}
            <View style={[styles.createForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.createFormHeader}>
                <View style={[styles.createFormIcon, { backgroundColor: '#2D1506' }]}>
                  <UserPlus size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.createFormTitle, { color: colors.text }]}>Nouveau modérateur</Text>
              </View>

              {accSuccess ? (
                <View style={[styles.successBanner, { backgroundColor: '#122A1B', borderColor: '#4ADE80' }]}>
                  <Check size={14} color="#4ADE80" />
                  <Text style={[styles.successBannerText, { color: '#4ADE80' }]}>{accSuccess}</Text>
                </View>
              ) : null}

              {accError ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, marginBottom: 12 }]}>
                  <AlertTriangle size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{accError}</Text>
                </View>
              ) : null}

              <Text style={[styles.formLabel, { color: colors.text }]}>Nom affiché</Text>
              <TextInput style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Ex: Sophie, Équipe Alpha..." placeholderTextColor={colors.textMuted} value={accLabel} onChangeText={v => { setAccLabel(v); setAccError(''); }} />

              <Text style={[styles.formLabel, { color: colors.text }]}>Identifiant de connexion</Text>
              <TextInput style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Ex: sophie2024, mod_alpha..." placeholderTextColor={colors.textMuted} value={accIdentifier} onChangeText={v => { setAccIdentifier(v); setAccError(''); }} autoCapitalize="none" autoCorrect={false} />

              <Text style={[styles.formLabel, { color: colors.text }]}>Code d'accès</Text>
              <TextInput style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="Min. 4 caractères" placeholderTextColor={colors.textMuted} value={accCode} onChangeText={v => { setAccCode(v); setAccError(''); }} autoCapitalize="none" autoCorrect={false} />

              <Text style={[styles.formLabel, { color: colors.text }]}>Rôle</Text>
              <View style={styles.roleSelector}>
                {(['standard', 'ia_validator'] as ModeratorRole[]).map(role => {
                  const cfg = ROLE_CONFIG[role];
                  const selected = accRole === role;
                  return (
                    <Pressable key={role} style={[styles.roleSelectorItem, { borderColor: selected ? cfg.color : colors.border, backgroundColor: selected ? cfg.bg : colors.background }]} onPress={() => setAccRole(role)}>
                      <View style={styles.roleSelectorRow}>
                        {selected ? <Check size={13} color={cfg.color} /> : <View style={styles.roleCheckPlaceholder} />}
                        <Text style={[styles.roleSelectorLabel, { color: selected ? cfg.color : colors.textSecondary }]}>{cfg.label}</Text>
                      </View>
                      <Text style={[styles.roleSelectorDesc, { color: colors.textMuted }]}>{cfg.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Permissions</Text>
              <View style={styles.permGrid}>
                {(['view', 'approve', 'reject', 'comment'] as ModeratorPermission[]).map(perm => {
                  const cfg = PERMISSION_CONFIG[perm];
                  const active = accPerms.includes(perm);
                  return (
                    <Pressable key={perm} style={[styles.permChip, { borderColor: active ? cfg.color : colors.border, backgroundColor: active ? cfg.color + '15' : colors.background }]} onPress={() => togglePermission(perm)}>
                      {active ? <Check size={11} color={cfg.color} /> : <View style={styles.permCheckPlaceholder} />}
                      <Text style={[styles.permChipText, { color: active ? cfg.color : colors.textMuted }]}>{cfg.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={[styles.createBtn, { backgroundColor: '#F59E0B' }, (!accLabel.trim() || !accIdentifier.trim() || accCode.length < 4) && { opacity: 0.4 }]} onPress={handleCreateAccount} disabled={!accLabel.trim() || !accIdentifier.trim() || accCode.length < 4}>
                <Plus size={18} color="#000" />
                <Text style={styles.createBtnText}>Créer le compte</Text>
              </Pressable>
            </View>

            {/* Accounts list */}
            <Text style={[styles.accountsListTitle, { color: colors.textSecondary }]}>COMPTES ACTIFS ({allModeratorAccounts.filter(a => !a.isRevoked).length})</Text>
            <View style={[styles.accountsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {allModeratorAccounts.map((account: ModeratorAccount) => {
                const cfg = ROLE_CONFIG[account.role];
                const tasksDone = moderationTasks.filter(t => t.assignedTo === account.id && t.status === 'done').length;
                const tasksPending = moderationTasks.filter(t => t.assignedTo === account.id && t.status === 'pending').length;
                return (
                  <View key={account.id} style={[styles.accountRow, { borderBottomColor: colors.border, opacity: account.isRevoked ? 0.5 : 1 }]}>
                    <View style={[styles.accountAvatar, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.accountAvatarText, { color: cfg.color }]}>{account.label.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.accountInfo}>
                      <View style={styles.accountNameRow}>
                        <Text style={[styles.accountName, { color: colors.text }]}>{account.label}</Text>
                        {account.isBuiltin && <View style={[styles.builtinTag, { backgroundColor: colors.surfaceLight }]}><Text style={[styles.builtinTagText, { color: colors.textMuted }]}>Intégré</Text></View>}
                        {account.isRevoked && <View style={[styles.revokedTag]}><Text style={styles.revokedTagText}>Révoqué</Text></View>}
                      </View>
                      <Text style={[styles.accountIdentifier, { color: colors.textMuted }]}>@{account.identifier}</Text>
                      <View style={styles.accountMeta}>
                        <View style={[styles.roleTag, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.roleTagText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        {(tasksDone > 0 || tasksPending > 0) && (
                          <Text style={[styles.accountTaskStats, { color: colors.textMuted }]}>
                            {tasksPending > 0 ? `${tasksPending} en cours` : ''}{tasksPending > 0 && tasksDone > 0 ? ' · ' : ''}{tasksDone > 0 ? `${tasksDone} traités` : ''}
                          </Text>
                        )}
                      </View>
                      <View style={styles.permRow}>
                        {account.permissions.map(perm => (
                          <View key={perm} style={[styles.permTag, { backgroundColor: PERMISSION_CONFIG[perm].color + '15' }]}>
                            <Text style={[styles.permTagText, { color: PERMISSION_CONFIG[perm].color }]}>{PERMISSION_CONFIG[perm].label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {!account.isBuiltin && (
                      <View style={styles.accountActions}>
                        {!account.isRevoked ? (
                          <Pressable style={[styles.revokeBtn, { backgroundColor: '#2A1000' }]} onPress={() => handleRevokeAccount(account)} hitSlop={8}>
                            <Ban size={14} color="#FB923C" />
                          </Pressable>
                        ) : null}
                        <Pressable style={[styles.deleteAccBtn, { backgroundColor: colors.dangerLight }]} onPress={() => handleDeleteAccount(account)} hitSlop={8}>
                          <Trash2 size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── LOGS ──────────────────────────────────── */}
        {validActiveTab === 'logs' && isUltime && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique des actions</Text>
            {moderationLogs.length === 0 ? (
              <EmptyState icon={<History size={40} color={colors.textMuted} />} title="Aucune action" message="Les actions de modération seront tracées ici." />
            ) : (
              moderationLogs.map((log: ModerationLog) => {
                const cfg = LOG_ACTION_CONFIG[log.action];
                return (
                  <View key={log.id} style={[styles.logEntry, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: cfg.color }]}>
                    <View style={styles.logTop}>
                      <View style={[styles.logActionChip, { backgroundColor: cfg.color + '15' }]}>
                        <Text style={[styles.logActionText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={[styles.logTime, { color: colors.textMuted }]}>{timeAgo(log.timestamp)}</Text>
                    </View>
                    <Text style={[styles.logDetail, { color: colors.textSecondary }]}>{log.detail}</Text>
                    <View style={styles.logBottom}>
                      <Text style={[styles.logModerator, { color: colors.textMuted }]}>par {log.moderatorLabel}</Text>
                      {log.publicationId ? (
                        <Text style={[styles.logPubId, { color: colors.textMuted }]}>pub: …{log.publicationId.slice(-6)}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── ASSIGN MODAL ──────────────────────────── */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Assigner à un modérateur</Text>
              <Pressable onPress={() => setShowAssignModal(false)} hitSlop={12}><X size={22} color={colors.textMuted} /></Pressable>
            </View>

            {assignSuccess ? (
              <View style={[styles.successBanner, { backgroundColor: '#122A1B', borderColor: '#4ADE80', marginBottom: 12 }]}>
                <Check size={14} color="#4ADE80" />
                <Text style={[styles.successBannerText, { color: '#4ADE80' }]}>{assignSuccess}</Text>
              </View>
            ) : null}

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Choisissez le modérateur qui va examiner cette publication :</Text>

            <ScrollView style={styles.modPickerList} showsVerticalScrollIndicator={false}>
              {assignableModerators.map((account: ModeratorAccount) => {
                const cfg = ROLE_CONFIG[account.role];
                const selected = assignTargetModId === account.id;
                const pending = moderationTasks.filter(t => t.assignedTo === account.id && t.status === 'pending').length;
                return (
                  <Pressable key={account.id} style={[styles.modPickerItem, { borderColor: selected ? cfg.color : colors.border, backgroundColor: selected ? cfg.bg : colors.background }]} onPress={() => setAssignTargetModId(account.id)}>
                    <View style={[styles.modPickerAvatar, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.modPickerAvatarText, { color: cfg.color }]}>{account.label.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.modPickerInfo}>
                      <Text style={[styles.modPickerName, { color: colors.text }]}>{account.label}</Text>
                      <Text style={[styles.modPickerRole, { color: colors.textMuted }]}>@{account.identifier} · {cfg.label}</Text>
                      {pending > 0 && <Text style={[styles.modPickerPending, { color: '#FBBF24' }]}>{pending} tâche{pending > 1 ? 's' : ''} en cours</Text>}
                    </View>
                    {selected && <Check size={18} color={cfg.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={[styles.confirmBtn, { backgroundColor: '#3B82F6' }, !assignTargetModId && { opacity: 0.4 }]} onPress={handleConfirmAssign} disabled={!assignTargetModId}>
              <Send size={16} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirmer l'assignation</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── DECISION MODAL ────────────────────────── */}
      <Modal visible={showDecisionModal} transparent animationType="slide" onRequestClose={() => setShowDecisionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {decisionType === 'approved' ? '✓ Approuver' : '✗ Refuser'} la publication
              </Text>
              <Pressable onPress={() => setShowDecisionModal(false)} hitSlop={12}><X size={22} color={colors.textMuted} /></Pressable>
            </View>

            {canComment && (
              <>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Commentaire (optionnel)</Text>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Expliquez votre décision..."
                  placeholderTextColor={colors.textMuted}
                  value={decisionComment}
                  onChangeText={setDecisionComment}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            <Pressable
              style={[styles.confirmBtn, { backgroundColor: decisionType === 'approved' ? '#16A34A' : '#DC2626', marginTop: canComment ? 16 : 8 }]}
              onPress={handleConfirmDecision}
            >
              {decisionType === 'approved' ? <Check size={16} color="#fff" /> : <X size={16} color="#fff" />}
              <Text style={styles.confirmBtnText}>
                {decisionType === 'approved' ? 'Confirmer l\'approbation' : 'Confirmer le refus'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── IMAGE ZOOM MODAL ──────────────────────── */}
      <Modal visible={!!zoomedImage} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomedImage(null)}>
          <View style={styles.zoomHeader}>
            <View style={styles.zoomTitleRow}>
              <ShieldAlert size={16} color="#EF4444" />
              <Text style={styles.zoomTitle}>Image signalée</Text>
            </View>
            <Pressable style={styles.zoomCloseBtn} onPress={() => setZoomedImage(null)}>
              <X size={22} color="#fff" />
            </Pressable>
          </View>
          {zoomedImage ? (
            <Image source={{ uri: zoomedImage }} style={styles.zoomedImage} contentFit="contain" />
          ) : null}
          <Text style={styles.zoomHint}>Appuyez n'importe où pour fermer</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  loginDecor: { position: 'absolute', right: -30, top: 40, opacity: 0.04, transform: [{ rotate: '-30deg' }] },
  loginIconWrap: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  loginTitle: { fontSize: 24, fontWeight: '700' as const, textAlign: 'center', marginBottom: 6 },
  loginSub: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  errorText: { fontSize: 13, fontWeight: '500' as const, flex: 1 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  fieldInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  loginBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  loginBtnDisabled: { opacity: 0.4 },
  loginBtnText: { fontSize: 16, fontWeight: '700' as const },

  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  dashHeaderLeft: { gap: 4, flex: 1 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: '700' as const },
  dashSub: { fontSize: 11 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { fontSize: 12, fontWeight: '600' as const },

  tabBar: { borderBottomWidth: 1, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 16 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, marginRight: 20 },
  tabLabel: { fontSize: 13, fontWeight: '600' as const },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabCountText: { fontSize: 11, fontWeight: '700' as const },
  dashScroll: { flex: 1 },

  sectionTitle: { fontSize: 17, fontWeight: '700' as const, paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  infoBannerText: { fontSize: 12, lineHeight: 18, flex: 1 },

  // Task card (delegated view)
  taskCard: { marginHorizontal: 16, marginVertical: 6, borderRadius: 14, padding: 14, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  taskAssignedBy: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  taskAssignedByText: { fontSize: 11, color: '#60A5FA', fontWeight: '500' as const },
  taskDate: { fontSize: 11 },
  taskPubText: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  taskImageWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, position: 'relative', marginBottom: 10 },
  taskImage: { width: '100%', height: 140 },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  taskApproveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  taskRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  taskActionText: { fontSize: 13, fontWeight: '600' as const },
  noPermText: { fontSize: 12, fontStyle: 'italic' as const },

  // Report card
  reportCard: { marginHorizontal: 16, marginVertical: 5, borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#EF4444', borderWidth: 1 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reportIconWrap: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  reportReason: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  reportTime: { fontSize: 11 },
  reportDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8, marginLeft: 34 },
  reportPubSection: { marginLeft: 34, gap: 6 },
  reportPubStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusChipText: { fontSize: 11, fontWeight: '600' as const },
  aiScoreChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  aiScoreChipText: { fontSize: 11, fontWeight: '700' as const },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  categoryChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  categoryChipText: { fontSize: 10, fontWeight: '600' as const },
  reportPubPreview: { fontSize: 12, lineHeight: 17, marginTop: 4, fontStyle: 'italic' as const },
  reportImageContainer: { gap: 5, marginTop: 4 },
  reportImageWrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  reportImage: { width: '100%', height: 160 },
  reportImageOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 6 },
  imageSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  imageSourceText: { fontSize: 10, flex: 1 },
  reportActions: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginLeft: 34, marginTop: 10 },
  reportActionBtns: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  approveBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  approveBtnText: { fontSize: 11, fontWeight: '600' as const },
  rejectBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  rejectBtnText: { fontSize: 11, fontWeight: '600' as const },
  deleteReportBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteReportBtnText: { fontSize: 11, fontWeight: '600' as const },
  reportPubId: { fontSize: 10 },

  // AI toxicity
  toxicityBanner: { marginHorizontal: 16, marginBottom: -2, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toxicityBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toxicityScore: { fontSize: 16, fontWeight: '800' as const },
  toxicityLevelChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  toxicityLevelText: { fontSize: 11, fontWeight: '600' as const },
  toxicityCats: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },

  // Assign tab
  noModsBanner: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 20, alignItems: 'center', gap: 10 },
  noModsText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  assignCard: { marginHorizontal: 16, marginVertical: 6, borderRadius: 14, padding: 14, borderWidth: 1 },
  assignCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  assignedBadgeText: { fontSize: 10, color: '#60A5FA', fontWeight: '600' as const },
  assignCardTime: { fontSize: 11, marginLeft: 'auto' as const },
  assignCardText: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  assignThumb: { width: '100%', height: 100, borderRadius: 8, marginBottom: 10, borderWidth: 1 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  assignBtnText: { fontSize: 13, color: '#60A5FA', fontWeight: '600' as const },

  // Accounts tab
  accountsSection: { paddingBottom: 20 },
  createForm: { marginHorizontal: 16, marginTop: 4, marginBottom: 20, borderRadius: 16, borderWidth: 1, padding: 16 },
  createFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  createFormIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  createFormTitle: { fontSize: 16, fontWeight: '700' as const },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  successBannerText: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  formLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 12 },
  formInput: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1 },
  roleSelector: { gap: 8, marginTop: 4 },
  roleSelectorItem: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  roleSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleCheckPlaceholder: { width: 13, height: 13 },
  roleSelectorLabel: { fontSize: 14, fontWeight: '600' as const },
  roleSelectorDesc: { fontSize: 12 },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  permChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  permCheckPlaceholder: { width: 11, height: 11 },
  permChipText: { fontSize: 13, fontWeight: '600' as const },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 16 },
  createBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#000' },

  accountsListTitle: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8 },
  accountsList: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accountRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  accountAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  accountAvatarText: { fontSize: 17, fontWeight: '700' as const },
  accountInfo: { flex: 1, gap: 4 },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountName: { fontSize: 14, fontWeight: '600' as const },
  builtinTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  builtinTagText: { fontSize: 10, fontWeight: '500' as const },
  revokedTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: '#3A0000' },
  revokedTagText: { fontSize: 10, fontWeight: '600' as const, color: '#EF4444' },
  accountIdentifier: { fontSize: 11 },
  accountMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleTagText: { fontSize: 11, fontWeight: '600' as const },
  accountTaskStats: { fontSize: 11 },
  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  permTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  permTagText: { fontSize: 10, fontWeight: '600' as const },
  accountActions: { gap: 6, marginTop: 2 },
  revokeBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  deleteAccBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Logs
  logEntry: { marginHorizontal: 16, marginVertical: 4, borderRadius: 12, padding: 12, borderWidth: 1, borderLeftWidth: 3 },
  logTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  logActionChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  logActionText: { fontSize: 11, fontWeight: '700' as const },
  logTime: { fontSize: 11 },
  logDetail: { fontSize: 13, lineHeight: 18 },
  logBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  logModerator: { fontSize: 11 },
  logPubId: { fontSize: 10 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, flex: 1 },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  modalLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  commentInput: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, minHeight: 80, textAlignVertical: 'top' as const },
  modPickerList: { maxHeight: 280, marginBottom: 12 },
  modPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  modPickerAvatar: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modPickerAvatarText: { fontSize: 16, fontWeight: '700' as const },
  modPickerInfo: { flex: 1, gap: 2 },
  modPickerName: { fontSize: 14, fontWeight: '600' as const },
  modPickerRole: { fontSize: 12 },
  modPickerPending: { fontSize: 11, fontWeight: '500' as const },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  confirmBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },

  // Zoom
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  zoomHeader: { position: 'absolute', top: 56, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  zoomTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoomTitle: { color: '#EF4444', fontSize: 14, fontWeight: '700' as const },
  zoomCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  zoomedImage: { width: '100%', height: '75%', borderRadius: 12 },
  zoomHint: { position: 'absolute', bottom: 48, color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  bottomSpacer: { height: 40 },
});
