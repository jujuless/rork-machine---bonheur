import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, LogOut, Clock, AlertTriangle, Eye, EyeOff, Leaf,
  Crown, Bot, Plus, Trash2, Key, Users, X, Check,
  ZoomIn, ExternalLink, ShieldAlert, ShieldCheck, ShieldOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { PublicationCard } from '@/components/PublicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Publication, Report, ModeratorRole, ModeratorCode } from '@/types';
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

const ROLE_CONFIG: Record<ModeratorRole, { label: string; color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  ultime: {
    label: 'Modérateur Ultime',
    color: '#F59E0B',
    bg: '#2D2206',
    icon: null,
    desc: 'Accès complet + gestion des codes',
  },
  standard: {
    label: 'Modérateur',
    color: '#4ADE80',
    bg: '#122A1B',
    icon: null,
    desc: 'Signalements utilisateurs & IA',
  },
  ia_validator: {
    label: 'Modérateur IA',
    color: '#818CF8',
    bg: '#1E1B4B',
    icon: null,
    desc: 'Validation des contenus pré-approuvés IA',
  },
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#FBBF24', bg: '#231A04', Icon: Clock },
  approved: { label: 'Approuvé', color: '#4ADE80', bg: '#052E16', Icon: ShieldCheck },
  rejected: { label: 'Refusé', color: '#EF4444', bg: '#2A0808', Icon: ShieldOff },
  reported: { label: 'Signalé', color: '#FB923C', bg: '#2A1000', Icon: ShieldAlert },
};

type DashTab = 'pending' | 'reports' | 'ai' | 'codes' | 'create_account';

export default function ModerateurTab() {
  const {
    isModerator, moderatorRole, loginModerator, logoutModerator,
    pendingPublications, reports, approvePublication, rejectPublication,
    moderatorDeletePublication,
    aiFlaggedPublications, aiValidatedPublications,
    moderatorCodes, createModeratorCode, deleteModeratorCode,
    publications,
    colors, t,
  } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<DashTab>('pending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<ModeratorRole>('standard');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
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
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            moderatorDeletePublication(publicationId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [moderatorDeletePublication]);

  const handleCreateCode = useCallback(() => {
    if (!newCode.trim() || !newLabel.trim()) {
      setCreateError('Remplissez tous les champs');
      return;
    }
    if (newCode.trim().length < 4) {
      setCreateError('Le code doit faire au moins 4 caractères');
      return;
    }
    const ok = createModeratorCode(newCode.trim(), newRole, newLabel.trim());
    if (!ok) {
      setCreateError('Ce code existe déjà');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewCode('');
    setNewLabel('');
    setNewRole('standard');
    setCreateError('');
    setCreateSuccess(true);
    setShowCreateModal(false);
    setTimeout(() => setCreateSuccess(false), 3000);
  }, [newCode, newLabel, newRole, createModeratorCode]);

  const handleDeleteCode = useCallback((item: ModeratorCode) => {
    Alert.alert(
      'Supprimer le code',
      `Supprimer le code de "${item.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteModeratorCode(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }, [deleteModeratorCode]);

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
            <View style={[styles.passwordWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
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
            <View style={[styles.passwordWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Entrez votre code"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={setCode}
                secureTextEntry={!showCode}
                autoCapitalize="none"
                autoCorrect={false}
                testID="moderator-code"
              />
              <Pressable
                onPress={() => setShowCode(prev => !prev)}
                hitSlop={8}
                style={styles.eyeBtn}
              >
                {showCode ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
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

  const allTabs: { key: DashTab; label: string; count: number; show: boolean }[] = [
    { key: 'pending' as DashTab, label: 'En attente', count: isIaValidator ? aiValidatedPublications.length : pendingPublications.length, show: true },
    { key: 'reports' as DashTab, label: 'Signalements', count: reports.length, show: !isIaValidator },
    { key: 'ai' as DashTab, label: 'Toxicité IA', count: aiFlaggedPublications.length, show: isUltime || isIaValidator },
    { key: 'codes' as DashTab, label: 'Codes', count: moderatorCodes.length, show: isUltime },
    { key: 'create_account' as DashTab, label: 'Créer un compte', count: 0, show: isUltime },
  ];
  const tabs = allTabs.filter(tab => tab.show);

  const validActiveTab = tabs.find(tb => tb.key === activeTab) ? activeTab : tabs[0]?.key ?? 'pending';
  const pendingList = isIaValidator ? aiValidatedPublications : pendingPublications;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.dashHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.dashHeaderLeft}>
          <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg }]}>
            {isUltime ? (
              <Crown size={14} color={roleCfg.color} />
            ) : isIaValidator ? (
              <Bot size={14} color={roleCfg.color} />
            ) : (
              <Shield size={14} color={roleCfg.color} />
            )}
            <Text style={[styles.roleBadgeText, { color: roleCfg.color }]}>
              {isUltime ? '"Modérateur Ultime"' : roleCfg.label}
            </Text>
          </View>
          <Text style={[styles.dashSub, { color: colors.textSecondary }]}>{roleCfg.desc}</Text>
        </View>
        <Pressable style={[styles.logoutBtn, { backgroundColor: colors.dangerLight }]} onPress={handleLogout}>
          <LogOut size={16} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Quitter</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map(tab => {
          const active = validActiveTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, active && { borderBottomColor: isUltime ? '#F59E0B' : colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, { color: active ? (isUltime ? '#F59E0B' : colors.primary) : colors.textMuted }]}>
                {tab.label}
              </Text>
              {tab.count > 0 ? (
                <View style={[styles.tabCount, { backgroundColor: active ? (isUltime ? '#F59E0B' : colors.primary) : colors.surface }]}>
                  <Text style={[styles.tabCountText, { color: active ? colors.background : colors.textMuted }]}>{tab.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.dashScroll}>

        {/* ── EN ATTENTE ─────────────────────────────── */}
        {validActiveTab === 'pending' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isIaValidator ? 'Publications pré-validées IA' : 'Publications en attente'}
            </Text>
            {isIaValidator && (
              <View style={[styles.infoBanner, { backgroundColor: '#1E1B4B', borderColor: '#4338CA' }]}>
                <Bot size={14} color="#818CF8" />
                <Text style={[styles.infoBannerText, { color: '#818CF8' }]}>
                  Ces publications n'ont aucun contenu toxique détecté par l'IA.
                </Text>
              </View>
            )}
            {pendingList.length === 0 ? (
              <EmptyState
                icon={<Clock size={40} color={colors.textMuted} />}
                title={t.noPendingPubs}
                message={t.noPendingPubsMsg}
              />
            ) : (
              pendingList.map((pub: Publication) => (
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
          </View>
        )}

        {/* ── SIGNALEMENTS ───────────────────────────── */}
        {validActiveTab === 'reports' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Signalements</Text>
            {reports.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle size={40} color={colors.textMuted} />}
                title="Aucun signalement"
                message="Aucun contenu n'a été signalé pour le moment."
              />
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
                      <Text style={[styles.reportReason, { color: colors.text }]}>
                        {REASON_LABELS[report.reason] || report.reason}
                      </Text>
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
                            <View style={[styles.aiScoreChip, {
                              backgroundColor: aiScore >= 70 ? '#3A0000' : aiScore >= 45 ? '#2A1000' : aiScore >= 20 ? '#231A04' : '#052E16',
                            }]}>
                              <Bot size={11} color={aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80'} />
                              <Text style={[styles.aiScoreChipText, {
                                color: aiScore >= 70 ? '#EF4444' : aiScore >= 45 ? '#FB923C' : aiScore >= 20 ? '#FBBF24' : '#4ADE80',
                              }]}>
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
                          <Text style={[styles.reportPubPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                            {reportedPub.text}
                          </Text>
                        ) : null}

                        {reportedPub.imageUrl ? (
                          <View style={styles.reportImageContainer}>
                            <Pressable
                              style={[styles.reportImageWrap, { borderColor: colors.border }]}
                              onPress={() => {
                                setZoomedImage(reportedPub.imageUrl!);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                            >
                              <Image
                                source={{ uri: reportedPub.imageUrl }}
                                style={styles.reportImage}
                                contentFit="cover"
                                transition={200}
                              />
                              <View style={styles.reportImageOverlay}>
                                <ZoomIn size={20} color="#fff" />
                              </View>
                            </Pressable>
                            <View style={[styles.imageSourceRow, { backgroundColor: colors.surfaceLight }]}>
                              <ExternalLink size={11} color={colors.textMuted} />
                              <Text style={[styles.imageSourceText, { color: colors.textMuted }]} numberOfLines={1}>
                                {reportedPub.imageUrl.slice(0, 48)}…
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={[styles.reportPubPreview, { color: colors.textMuted, fontStyle: 'italic' }]}>
                        Publication introuvable (supprimée)
                      </Text>
                    )}

                    <View style={styles.reportActions}>
                      <Text style={[styles.reportPubId, { color: colors.textMuted }]}>ID: {report.publicationId.slice(-8)}</Text>
                      <View style={styles.reportActionBtns}>
                        {reportedPub && reportedPub.status === 'pending' && (
                          <>
                            <Pressable
                              style={[styles.approveBtn, { backgroundColor: colors.successLight }]}
                              onPress={() => handleApprove(report.publicationId)}
                              hitSlop={8}
                            >
                              <Check size={13} color={colors.success} />
                              <Text style={[styles.approveBtnText, { color: colors.success }]}>Approuver</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.rejectBtn, { backgroundColor: colors.dangerLight }]}
                              onPress={() => handleReject(report.publicationId)}
                              hitSlop={8}
                            >
                              <X size={13} color={colors.danger} />
                              <Text style={[styles.rejectBtnText, { color: colors.danger }]}>Refuser</Text>
                            </Pressable>
                          </>
                        )}
                        <Pressable
                          style={[styles.deleteReportBtn, { backgroundColor: '#3A0000' }]}
                          onPress={() => handleDeleteReportedPost(report.publicationId)}
                          hitSlop={8}
                        >
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
              <Text style={[styles.infoBannerText, { color: '#A78BFA' }]}>
                Ces contenus ont un score de nocivité ≥ 40/100. Ils nécessitent une révision manuelle.
              </Text>
            </View>
            {aiFlaggedPublications.length === 0 ? (
              <EmptyState
                icon={<Bot size={40} color={colors.textMuted} />}
                title="Aucun contenu toxique"
                message="L'IA n'a détecté aucun contenu problématique pour le moment."
              />
            ) : (
              aiFlaggedPublications.map((pub: Publication) => {
                const dangerCfg = pub.aiAnalysis
                  ? DANGER_LEVEL_CONFIG[pub.aiAnalysis.dangerLevel]
                  : null;
                return (
                  <View key={pub.id}>
                    {dangerCfg && pub.aiAnalysis && (
                      <View style={[styles.toxicityBanner, { backgroundColor: dangerCfg.bg, borderColor: dangerCfg.color + '50' }]}>
                        <View style={styles.toxicityBannerLeft}>
                          <Text style={[styles.toxicityScore, { color: dangerCfg.color }]}>
                            {pub.aiAnalysis.score}/100
                          </Text>
                          <View style={[styles.toxicityLevelChip, { backgroundColor: dangerCfg.color + '20' }]}>
                            <Text style={[styles.toxicityLevelText, { color: dangerCfg.color }]}>
                              Niveau {dangerCfg.label}
                            </Text>
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
                    <PublicationCard
                      publication={pub}
                      showStatus
                      showModeratorActions
                      showReportButton={false}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── CRÉER COMPTE ───────────────────────────── */}
        {validActiveTab === 'create_account' && isUltime && (
          <View style={styles.createAccountSection}>
            <View style={styles.createAccountHeader}>
              <View style={[styles.createAccountIconWrap, { backgroundColor: '#2D1506' }]}>
                <Users size={28} color="#F59E0B" />
              </View>
              <Text style={[styles.createAccountTitle, { color: colors.text }]}>Créer un compte modérateur</Text>
              <Text style={[styles.createAccountSubtitle, { color: colors.textSecondary }]}>
                Attribuez un accès modération à un collaborateur. Le compte créé pourra consulter les signalements et les publications en attente.
              </Text>
            </View>

            {createSuccess && (
              <View style={[styles.successBanner, { backgroundColor: '#122A1B', borderColor: '#4ADE80' }]}>
                <Check size={16} color="#4ADE80" />
                <Text style={[styles.successBannerText, { color: '#4ADE80' }]}>Compte créé avec succès !</Text>
              </View>
            )}

            {createError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, marginBottom: 4 }]}>
                <AlertTriangle size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{createError}</Text>
              </View>
            ) : null}

            <View style={[styles.createAccountForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formFieldLabel, { color: colors.text }]}>Nom du modérateur</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: Sophie, Équipe Alpha..."
                placeholderTextColor={colors.textMuted}
                value={newLabel}
                onChangeText={v => { setNewLabel(v); setCreateError(''); }}
              />

              <Text style={[styles.formFieldLabel, { color: colors.text }]}>Code d'accès</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: Mod2024, Secure99..."
                placeholderTextColor={colors.textMuted}
                value={newCode}
                onChangeText={v => { setNewCode(v); setCreateError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.formFieldLabel, { color: colors.text }]}>Rôle attribué</Text>
              <View style={styles.roleSelector}>
                {(['standard', 'ia_validator'] as ModeratorRole[]).map(role => {
                  const cfg = ROLE_CONFIG[role];
                  const selected = newRole === role;
                  return (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleSelectorItem,
                        { borderColor: selected ? cfg.color : colors.border, backgroundColor: selected ? cfg.bg : colors.background },
                      ]}
                      onPress={() => setNewRole(role)}
                    >
                      <View style={styles.roleSelectorRow}>
                        {selected ? <Check size={14} color={cfg.color} /> : <View style={styles.roleCheckPlaceholder} />}
                        <Text style={[styles.roleSelectorLabel, { color: selected ? cfg.color : colors.textSecondary }]}>
                          {cfg.label}
                        </Text>
                      </View>
                      <Text style={[styles.roleSelectorDesc, { color: colors.textMuted }]}>{cfg.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.createAccountBtn, { backgroundColor: '#F59E0B' }, (!newCode.trim() || !newLabel.trim()) && { opacity: 0.4 }]}
                onPress={handleCreateCode}
                disabled={!newCode.trim() || !newLabel.trim()}
              >
                <Plus size={18} color="#000" />
                <Text style={styles.createAccountBtnText}>Créer le compte</Text>
              </Pressable>
            </View>

            {moderatorCodes.length > 0 && (
              <View style={styles.existingAccountsSection}>
                <Text style={[styles.existingAccountsTitle, { color: colors.textSecondary }]}>COMPTES CRÉÉS ({moderatorCodes.length})</Text>
                <View style={[styles.existingAccountsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {moderatorCodes.map((item: ModeratorCode) => {
                    const cfg = ROLE_CONFIG[item.role];
                    return (
                      <View key={item.id} style={[styles.accountItem, { borderBottomColor: colors.border }]}>
                        <View style={[styles.accountAvatar, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.accountAvatarText, { color: cfg.color }]}>
                            {item.label.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.accountInfo}>
                          <Text style={[styles.accountName, { color: colors.text }]}>{item.label}</Text>
                          <View style={[styles.roleTag, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.roleTagText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>
                        <Pressable
                          style={[styles.deleteCodeBtn, { backgroundColor: colors.dangerLight }]}
                          onPress={() => handleDeleteCode(item)}
                          hitSlop={8}
                        >
                          <Trash2 size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── CODES ──────────────────────────────────── */}
        {validActiveTab === 'codes' && isUltime && (
          <View>
            <View style={styles.codesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Gestion des codes</Text>
              <Pressable
                style={[styles.createCodeBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={16} color="#000" />
                <Text style={styles.createCodeBtnText}>Créer</Text>
              </Pressable>
            </View>

            <View style={[styles.builtinSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.builtinTitle, { color: colors.textSecondary }]}>Codes intégrés (non modifiables)</Text>
              {[
                { code: 'Modérateur123', role: 'ultime' as ModeratorRole, label: '"Modérateur Ultime"' },
                { code: 'MAB01', role: 'standard' as ModeratorRole, label: 'Modérateur' },
              ].map(item => {
                const cfg = ROLE_CONFIG[item.role];
                return (
                  <View key={item.code} style={[styles.codeItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.codeIconWrap, { backgroundColor: cfg.bg }]}>
                      <Key size={14} color={cfg.color} />
                    </View>
                    <View style={styles.codeInfo}>
                      <Text style={[styles.codeName, { color: colors.text }]}>{item.label}</Text>
                      <View style={[styles.roleTag, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.roleTagText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={[styles.lockBadge, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.lockBadgeText, { color: colors.textMuted }]}>Intégré</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {moderatorCodes.length === 0 ? (
              <View style={styles.emptyCodesWrap}>
                <Users size={36} color={colors.textMuted} />
                <Text style={[styles.emptyCodesTitle, { color: colors.textSecondary }]}>Aucun code créé</Text>
                <Text style={[styles.emptyCodesDesc, { color: colors.textMuted }]}>
                  Appuyez sur "Créer" pour attribuer un accès modérateur à un collaborateur.
                </Text>
              </View>
            ) : (
              <View style={[styles.dynamicSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.builtinTitle, { color: colors.textSecondary }]}>Codes créés par vous</Text>
                {moderatorCodes.map((item: ModeratorCode) => {
                  const cfg = ROLE_CONFIG[item.role];
                  return (
                    <View key={item.id} style={[styles.codeItem, { borderBottomColor: colors.border }]}>
                      <View style={[styles.codeIconWrap, { backgroundColor: cfg.bg }]}>
                        <Key size={14} color={cfg.color} />
                      </View>
                      <View style={styles.codeInfo}>
                        <Text style={[styles.codeName, { color: colors.text }]}>{item.label}</Text>
                        <View style={[styles.roleTag, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.roleTagText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        <Text style={[styles.codeDate, { color: colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <Pressable
                        style={[styles.deleteCodeBtn, { backgroundColor: colors.dangerLight }]}
                        onPress={() => handleDeleteCode(item)}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── IMAGE ZOOM MODAL ───────────────────────── */}
      <Modal
        visible={!!zoomedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedImage(null)}
      >
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
            <Image
              source={{ uri: zoomedImage }}
              style={styles.zoomedImage}
              contentFit="contain"
            />
          ) : null}
          <Text style={styles.zoomHint}>Appuyez n'importe où pour fermer</Text>
        </Pressable>
      </Modal>

      {/* ── CREATE CODE MODAL ─────────────────────── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Créer un code modérateur</Text>
              <Pressable onPress={() => setShowCreateModal(false)} hitSlop={12}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {createError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, marginBottom: 12 }]}>
                <AlertTriangle size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{createError}</Text>
              </View>
            ) : null}

            <Text style={[styles.modalLabel, { color: colors.text }]}>Nom du modérateur</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Sophie, Équipe Alpha..."
              placeholderTextColor={colors.textMuted}
              value={newLabel}
              onChangeText={setNewLabel}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Code d'accès</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Mod2024, Secure99..."
              placeholderTextColor={colors.textMuted}
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Rôle</Text>
            <View style={styles.roleSelector}>
              {(['standard', 'ia_validator'] as ModeratorRole[]).map(role => {
                const cfg = ROLE_CONFIG[role];
                const selected = newRole === role;
                return (
                  <Pressable
                    key={role}
                    style={[
                      styles.roleSelectorItem,
                      { borderColor: selected ? cfg.color : colors.border, backgroundColor: selected ? cfg.bg : colors.background },
                    ]}
                    onPress={() => setNewRole(role)}
                  >
                    <View style={styles.roleSelectorRow}>
                      {selected ? <Check size={14} color={cfg.color} /> : <View style={styles.roleCheckPlaceholder} />}
                      <Text style={[styles.roleSelectorLabel, { color: selected ? cfg.color : colors.textSecondary }]}>
                        {cfg.label}
                      </Text>
                    </View>
                    <Text style={[styles.roleSelectorDesc, { color: colors.textMuted }]}>{cfg.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.createConfirmBtn, { backgroundColor: '#F59E0B' }]}
              onPress={handleCreateCode}
            >
              <Key size={16} color="#000" />
              <Text style={styles.createConfirmBtnText}>Créer le code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  loginDecor: {
    position: 'absolute',
    right: -30,
    top: 40,
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
    lineHeight: 20,
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
  errorText: { fontSize: 13, fontWeight: '500' as const, flex: 1 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  loginBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.4 },
  loginBtnText: { fontSize: 16, fontWeight: '700' as const },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dashHeaderLeft: { gap: 6, flex: 1 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '700' as const },
  dashSub: { fontSize: 12 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 12, fontWeight: '600' as const },
  tabBar: { borderBottomWidth: 1, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 16 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' as const },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabCountText: { fontSize: 11, fontWeight: '700' as const },
  dashScroll: { flex: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBannerText: { fontSize: 12, lineHeight: 18, flex: 1 },

  reportCard: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    padding: 14,
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
  reportIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportReason: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  reportTime: { fontSize: 11 },
  reportDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
    marginLeft: 34,
  },
  reportPubSection: { marginLeft: 34, gap: 6 },
  reportPubStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: { fontSize: 11, fontWeight: '600' as const },
  aiScoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiScoreChipText: { fontSize: 11, fontWeight: '700' as const },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  categoryChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryChipText: { fontSize: 10, fontWeight: '600' as const },
  reportPubPreview: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  reportImageContainer: { gap: 5, marginTop: 4 },
  reportImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  reportImage: {
    width: '100%',
    height: 160,
  },
  reportImageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 6,
  },
  imageSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  imageSourceText: { fontSize: 10, flex: 1 },
  reportActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginLeft: 34,
    marginTop: 10,
  },
  reportActionBtns: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  approveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: { fontSize: 11, fontWeight: '600' as const },
  rejectBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rejectBtnText: { fontSize: 11, fontWeight: '600' as const },
  deleteReportBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteReportBtnText: { fontSize: 11, fontWeight: '600' as const },
  reportPubId: { fontSize: 10 },

  toxicityBanner: {
    marginHorizontal: 16,
    marginBottom: -2,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toxicityBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toxicityScore: { fontSize: 16, fontWeight: '800' as const },
  toxicityLevelChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toxicityLevelText: { fontSize: 11, fontWeight: '600' as const },
  toxicityCats: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },

  codesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  createCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createCodeBtnText: { color: '#000', fontWeight: '700' as const, fontSize: 13 },
  builtinSection: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  builtinTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  codeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeInfo: { flex: 1, gap: 4 },
  codeName: { fontSize: 14, fontWeight: '600' as const },
  roleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: { fontSize: 11, fontWeight: '600' as const },
  codeDate: { fontSize: 11 },
  lockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  lockBadgeText: { fontSize: 11, fontWeight: '500' as const },
  deleteCodeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dynamicSection: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyCodesWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyCodesTitle: { fontSize: 15, fontWeight: '600' as const },
  emptyCodesDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  bottomSpacer: { height: 40 },

  createAccountSection: { paddingHorizontal: 16, paddingTop: 20 },
  createAccountHeader: { alignItems: 'center', paddingBottom: 20, gap: 10 },
  createAccountIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  createAccountTitle: { fontSize: 20, fontWeight: '700' as const, textAlign: 'center' },
  createAccountSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  successBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  successBannerText: { fontSize: 13, fontWeight: '600' as const },
  createAccountForm: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 0,
    marginBottom: 20,
  },
  formFieldLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 14 },
  formInput: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  createAccountBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 20,
  },
  createAccountBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#000' },
  existingAccountsSection: { marginBottom: 20 },
  existingAccountsTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  existingAccountsList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  accountItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarText: { fontSize: 16, fontWeight: '700' as const },
  accountInfo: { flex: 1, gap: 4 },
  accountName: { fontSize: 14, fontWeight: '600' as const },

  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomHeader: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  zoomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  zoomCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: '100%',
    height: '75%',
    borderRadius: 12,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' as const },
  modalLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 14 },
  modalInput: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  roleSelector: { gap: 8, marginTop: 4 },
  roleSelectorItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  roleSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleCheckPlaceholder: { width: 14, height: 14 },
  roleSelectorLabel: { fontSize: 14, fontWeight: '600' as const },
  roleSelectorDesc: { fontSize: 12 },
  createConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 20,
  },
  createConfirmBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#000' },
});
