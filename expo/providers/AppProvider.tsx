import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Publication, Report, ReportReason, User, AppSettings, ReactionType, ColorTheme,
  ModeratorRole, ModeratorAccount, ModeratorPermission, ModerationTask, ModerationLog,
  AIAnalysisResult, AIGrade,
} from '@/types';
import { DarkColors, LightColors } from '@/constants/colors';
import { translations, TranslationStrings } from '@/constants/translations';
import { MOCK_PUBLICATIONS } from '@/mocks/publications';
import { containsBannedContent, buildSafetyFeedbacks, analyzeImageSafety } from '@/utils/contentFilter';
import type { DangerLevel, ToxicityCategory } from '@/utils/contentFilter';

const STORAGE_KEYS = {
  publications: 'seranova_publications',
  reports: 'seranova_reports',
  settings: 'seranova_settings',
  profile: 'seranova_profile',
  reactions: 'seranova_reactions',
  moderatorAccounts: 'seranova_moderator_accounts_v2',
  moderationTasks: 'seranova_moderation_tasks',
  moderationLogs: 'seranova_moderation_logs',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  language: 'fr',
  theme: 'dark',
  textSize: 'medium',
};

const DEFAULT_PROFILE = {
  name: 'Moi',
  bio: '',
  avatarUrl: undefined as string | undefined,
};

// Built-in accounts — never stored, always present
// SQL: these are seeded rows in moderator_accounts with is_builtin = TRUE
export const BUILTIN_ACCOUNTS: ModeratorAccount[] = [
  {
    id: 'builtin-ultime',
    identifier: 'moderateur123',
    code: 'Modérateur123',
    role: 'ultime',
    permissions: ['view', 'approve', 'reject', 'comment'],
    label: '"Modérateur Ultime"',
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00.000Z',
    isRevoked: false,
    isBuiltin: true,
  },
  {
    id: 'builtin-standard',
    identifier: 'mab01',
    code: 'MAB01',
    role: 'standard',
    permissions: ['view', 'approve', 'reject', 'comment'],
    label: 'Modérateur',
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00.000Z',
    isRevoked: false,
    isBuiltin: true,
  },
];

export function generateAIAnalysis(text: string, hasMedia: boolean, _isVideo: boolean): AIAnalysisResult {
  const textAnalysis = containsBannedContent(text);
  const imageCheck = hasMedia ? analyzeImageSafety('') : { flagged: false, reason: null };

  let combinedScore = textAnalysis.score;
  const combinedCategories = [...textAnalysis.categories] as ToxicityCategory[];

  if (imageCheck.flagged) {
    combinedScore = Math.min(100, combinedScore + 30);
    if (!combinedCategories.includes('sexual')) combinedCategories.push('sexual');
  }

  const finalScore = Math.min(100, combinedScore);

  let grade: AIGrade;
  if (finalScore >= 70) grade = 'critical';
  else if (finalScore >= 45) grade = 'dangerous';
  else if (finalScore >= 20) grade = 'warning';
  else grade = 'safe';

  let dangerLevel: DangerLevel;
  if (finalScore >= 70) dangerLevel = 'critical';
  else if (finalScore >= 45) dangerLevel = 'high';
  else if (finalScore >= 20) dangerLevel = 'medium';
  else dangerLevel = 'low';

  const recommendation: 'allow' | 'review' | 'block' =
    dangerLevel === 'low' ? 'allow' :
    dangerLevel === 'medium' ? 'review' : 'block';

  const feedbacks = buildSafetyFeedbacks({
    hasBannedContent: textAnalysis.hasBannedContent,
    categories: combinedCategories,
    score: finalScore,
    dangerLevel,
    matchedTerms: textAnalysis.matchedTerms,
    sanitized: textAnalysis.sanitized,
    recommendation,
  });

  console.log('Seranova: Content safety analysis — score:', finalScore, 'grade:', grade, 'categories:', combinedCategories);

  return {
    id: `ai-${Date.now()}`,
    publicationId: '',
    score: finalScore,
    grade,
    dangerLevel,
    categories: combinedCategories,
    recommendation,
    feedbacks,
    analyzedAt: new Date().toISOString(),
  };
}

export { generateAIAnalysis as analyzeContentSafety };

export const [AppProvider, useApp] = createContextHook(() => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorRole, setModeratorRole] = useState<ModeratorRole | null>(null);
  const [currentModeratorId, setCurrentModeratorId] = useState<string>('');
  const [currentModeratorLabel, setCurrentModeratorLabel] = useState<string>('');
  const [currentModeratorPermissions, setCurrentModeratorPermissions] = useState<ModeratorPermission[]>([]);
  const [moderatorAccounts, setModeratorAccounts] = useState<ModeratorAccount[]>([]);
  const [moderationTasks, setModerationTasks] = useState<ModerationTask[]>([]);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialLoad = useRef(true);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE);
  const [reactions, setReactions] = useState<Record<string, ReactionType[]>>({});
  const [showInstantPositif, setShowInstantPositif] = useState(true);

  const colors: ColorTheme = useMemo(
    () => (settings.theme === 'dark' ? DarkColors : LightColors),
    [settings.theme]
  );

  const textScale = useMemo(() => {
    switch (settings.textSize) {
      case 'small': return 0.85;
      case 'large': return 1.15;
      default: return 1.0;
    }
  }, [settings.textSize]);

  const t: TranslationStrings = useMemo(
    () => translations[settings.language],
    [settings.language]
  );

  const currentUser: User = useMemo(() => ({
    id: 'user-me',
    name: userProfile.name,
    bio: userProfile.bio,
    avatarUrl: userProfile.avatarUrl,
    isModerator: false,
    role: 'user',
    plan: 'free',
  }), [userProfile]);

  // All accounts = builtin + dynamic
  const allModeratorAccounts = useMemo(
    () => [...BUILTIN_ACCOUNTS, ...moderatorAccounts],
    [moderatorAccounts]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          storedPubs, storedReports, storedSettings, storedProfile,
          storedReactions, storedAccounts, storedTasks, storedLogs,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.publications),
          AsyncStorage.getItem(STORAGE_KEYS.reports),
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.reactions),
          AsyncStorage.getItem(STORAGE_KEYS.moderatorAccounts),
          AsyncStorage.getItem(STORAGE_KEYS.moderationTasks),
          AsyncStorage.getItem(STORAGE_KEYS.moderationLogs),
        ]);

        if (storedPubs) {
          const parsed = JSON.parse(storedPubs) as Publication[];
          setPublications(parsed.length > 0 ? parsed : MOCK_PUBLICATIONS);
        } else {
          setPublications(MOCK_PUBLICATIONS);
        }

        if (storedReports) setReports(JSON.parse(storedReports) as Report[]);
        if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        if (storedProfile) setUserProfile({ ...DEFAULT_PROFILE, ...JSON.parse(storedProfile) });
        if (storedReactions) setReactions(JSON.parse(storedReactions));
        if (storedAccounts) setModeratorAccounts(JSON.parse(storedAccounts) as ModeratorAccount[]);
        if (storedTasks) setModerationTasks(JSON.parse(storedTasks) as ModerationTask[]);
        if (storedLogs) setModerationLogs(JSON.parse(storedLogs) as ModerationLog[]);
      } catch (error) {
        console.log('Seranova: Error loading data:', error);
        setPublications(MOCK_PUBLICATIONS);
      } finally {
        isInitialLoad.current = false;
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.publications, JSON.stringify(publications))
        .catch(err => console.log('Seranova: Error saving publications:', err));
    }
  }, [publications, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports))
        .catch(err => console.log('Seranova: Error saving reports:', err));
    }
  }, [reports, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
        .catch(err => console.log('Seranova: Error saving settings:', err));
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(userProfile))
        .catch(err => console.log('Seranova: Error saving profile:', err));
    }
  }, [userProfile, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.reactions, JSON.stringify(reactions))
        .catch(err => console.log('Seranova: Error saving reactions:', err));
    }
  }, [reactions, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.moderatorAccounts, JSON.stringify(moderatorAccounts))
        .catch(err => console.log('Seranova: Error saving moderator accounts:', err));
    }
  }, [moderatorAccounts, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.moderationTasks, JSON.stringify(moderationTasks))
        .catch(err => console.log('Seranova: Error saving moderation tasks:', err));
    }
  }, [moderationTasks, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.moderationLogs, JSON.stringify(moderationLogs))
        .catch(err => console.log('Seranova: Error saving moderation logs:', err));
    }
  }, [moderationLogs, isLoaded]);

  const approvedPublications = useMemo(
    () => publications
      .filter(p => p.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [publications]
  );

  const pendingPublications = useMemo(
    () => publications
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [publications]
  );

  const userPublications = useMemo(
    () => publications
      .filter(p => p.authorId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [publications, currentUser.id]
  );

  const galleryPublications = useMemo(
    () => publications.filter(p => p.status === 'approved' && p.imageUrl),
    [publications]
  );

  const videoPublications = useMemo(
    () => publications
      .filter(p => p.status === 'approved' && p.videoUrl)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [publications]
  );

  const aiReportedIds = useMemo(
    () => new Set(reports.filter(r => r.reason === 'ai_content').map(r => r.publicationId)),
    [reports]
  );

  const aiFlaggedPublications = useMemo(
    () => publications.filter(p =>
      aiReportedIds.has(p.id) ||
      (p.aiAnalysis && p.aiAnalysis.score >= 40)
    ),
    [publications, aiReportedIds]
  );

  const aiValidatedPublications = useMemo(
    () => pendingPublications.filter(p =>
      !aiReportedIds.has(p.id) &&
      !(p.aiAnalysis && p.aiAnalysis.score >= 40)
    ),
    [pendingPublications, aiReportedIds]
  );

  // Tasks assigned to the currently logged-in moderator
  const myAssignedTasks = useMemo(
    () => moderationTasks
      .filter(t => t.assignedTo === currentModeratorId && t.status === 'pending')
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()),
    [moderationTasks, currentModeratorId]
  );

  // Helper: add a log entry
  const addLog = useCallback((
    action: ModerationLog['action'],
    publicationId: string,
    detail: string,
    modId: string,
    modLabel: string,
  ) => {
    const entry: ModerationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      moderatorId: modId,
      moderatorLabel: modLabel,
      publicationId,
      action,
      detail,
      timestamp: new Date().toISOString(),
    };
    console.log('Seranova: ModerationLog:', action, detail);
    setModerationLogs(prev => [entry, ...prev]);
  }, []);

  const addPublication = useCallback((text: string, mediaUrl?: string, isVideo?: boolean, aiAnalysis?: AIAnalysisResult) => {
    const isBlocked = aiAnalysis && aiAnalysis.recommendation === 'block';
    const newPub: Publication = {
      id: `pub-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      text,
      imageUrl: !isVideo ? mediaUrl : undefined,
      videoUrl: isVideo ? mediaUrl : undefined,
      status: isBlocked ? 'rejected' : 'pending',
      createdAt: new Date().toISOString(),
      aiAnalysis,
    };
    console.log('Seranova: Adding publication:', newPub.id, 'safety score:', aiAnalysis?.score, 'status:', newPub.status);
    setPublications(prev => [newPub, ...prev]);

    if (aiAnalysis && aiAnalysis.score >= 40) {
      const autoReport: Report = {
        id: `report-auto-${Date.now()}`,
        publicationId: newPub.id,
        reporterId: 'system-ai',
        reason: 'ai_content',
        description: `Détection automatique IA — Score nocivité: ${aiAnalysis.score}/100. Catégories: ${aiAnalysis.categories.join(', ')}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      console.log('Seranova: Auto-flagging publication with AI score:', aiAnalysis.score);
      setReports(prev => [autoReport, ...prev]);
    }
  }, [currentUser.id, currentUser.name]);

  const editPublication = useCallback((id: string, text: string, imageUrl?: string) => {
    console.log('Seranova: Editing publication:', id);
    setPublications(prev => prev.map(p =>
      p.id === id && p.authorId === currentUser.id
        ? { ...p, text, imageUrl: imageUrl || p.imageUrl, status: 'pending' as const }
        : p
    ));
  }, [currentUser.id]);

  const deletePublication = useCallback((id: string) => {
    console.log('Seranova: Deleting publication:', id);
    setPublications(prev => prev.filter(p =>
      !(p.id === id && p.authorId === currentUser.id)
    ));
  }, [currentUser.id]);

  const moderatorDeletePublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('Seranova: Moderator deleting publication:', id);
    addLog('rejected', id, 'Publication supprimée par le modérateur', currentModeratorId, currentModeratorLabel);
    setPublications(prev => prev.filter(p => p.id !== id));
    setReports(prev => prev.filter(r => r.publicationId !== id));
    setModerationTasks(prev => prev.filter(t => t.publicationId !== id));
  }, [isModerator, addLog, currentModeratorId, currentModeratorLabel]);

  const approvePublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('Seranova: Approving publication:', id);
    addLog('approved', id, 'Publication approuvée', currentModeratorId, currentModeratorLabel);
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved' as const } : p
    ));
  }, [isModerator, addLog, currentModeratorId, currentModeratorLabel]);

  const rejectPublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('Seranova: Rejecting publication:', id);
    addLog('rejected', id, 'Publication refusée', currentModeratorId, currentModeratorLabel);
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'rejected' as const } : p
    ));
  }, [isModerator, addLog, currentModeratorId, currentModeratorLabel]);

  const reportPublication = useCallback((publicationId: string, reason: ReportReason, description: string) => {
    const newReport: Report = {
      id: `report-${Date.now()}`,
      publicationId,
      reporterId: currentUser.id,
      reason,
      description,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    console.log('Seranova: Reporting publication:', publicationId);
    setReports(prev => [newReport, ...prev]);
  }, [currentUser.id]);

  // Login: check builtin accounts first, then dynamic accounts
  // SQL equivalent: SELECT * FROM moderator_accounts WHERE identifier = ? AND code = ? AND is_revoked = FALSE LIMIT 1
  const loginModerator = useCallback((identifier: string, code: string): boolean => {
    const normalizedId = identifier.toLowerCase().trim();
    const allAccounts = [...BUILTIN_ACCOUNTS, ...moderatorAccounts];
    const account = allAccounts.find(
      a => a.identifier.toLowerCase() === normalizedId && a.code === code && !a.isRevoked
    );
    if (account) {
      console.log('Seranova: Moderator logged in — id:', account.id, 'role:', account.role);
      setIsModerator(true);
      setModeratorRole(account.role);
      setCurrentModeratorId(account.id);
      setCurrentModeratorLabel(account.label);
      setCurrentModeratorPermissions(account.permissions);
      return true;
    }
    console.log('Seranova: Moderator login failed for identifier:', normalizedId);
    return false;
  }, [moderatorAccounts]);

  const logoutModerator = useCallback(() => {
    console.log('Seranova: Moderator logged out');
    setIsModerator(false);
    setModeratorRole(null);
    setCurrentModeratorId('');
    setCurrentModeratorLabel('');
    setCurrentModeratorPermissions([]);
  }, []);

  // Create a new moderator account (only ultime can do this)
  // SQL: INSERT INTO moderator_accounts (...)
  const createModeratorAccount = useCallback((params: {
    identifier: string;
    code: string;
    role: ModeratorRole;
    permissions: ModeratorPermission[];
    label: string;
  }): { ok: boolean; error?: string } => {
    if (moderatorRole !== 'ultime') return { ok: false, error: 'Permission refusée' };

    const allAccounts = [...BUILTIN_ACCOUNTS, ...moderatorAccounts];
    const idLower = params.identifier.toLowerCase().trim();

    if (!idLower) return { ok: false, error: 'L\'identifiant est requis' };
    if (params.code.length < 4) return { ok: false, error: 'Le code doit faire au moins 4 caractères' };
    if (!params.label.trim()) return { ok: false, error: 'Le nom est requis' };

    if (allAccounts.some(a => a.identifier.toLowerCase() === idLower)) {
      return { ok: false, error: 'Cet identifiant existe déjà' };
    }

    const newAccount: ModeratorAccount = {
      id: `mod-${Date.now()}`,
      identifier: idLower,
      code: params.code,
      role: params.role,
      permissions: params.permissions,
      label: params.label.trim(),
      createdBy: currentModeratorId,
      createdAt: new Date().toISOString(),
      isRevoked: false,
      isBuiltin: false,
    };

    console.log('Seranova: Creating moderator account:', newAccount.id, newAccount.role);
    setModeratorAccounts(prev => [...prev, newAccount]);
    addLog('account_created', '', `Compte créé : "${newAccount.label}" (${newAccount.identifier}) — rôle: ${newAccount.role}`, currentModeratorId, currentModeratorLabel);
    return { ok: true };
  }, [moderatorRole, moderatorAccounts, currentModeratorId, currentModeratorLabel, addLog]);

  // Revoke a moderator account (only ultime can do this)
  // SQL: UPDATE moderator_accounts SET is_revoked = TRUE WHERE id = ?
  const revokeModeratorAccess = useCallback((accountId: string) => {
    if (moderatorRole !== 'ultime') return;
    const account = moderatorAccounts.find(a => a.id === accountId);
    if (!account) return;
    console.log('Seranova: Revoking moderator account:', accountId);
    setModeratorAccounts(prev => prev.map(a =>
      a.id === accountId ? { ...a, isRevoked: true } : a
    ));
    addLog('account_revoked', '', `Accès révoqué : "${account.label}" (${account.identifier})`, currentModeratorId, currentModeratorLabel);
  }, [moderatorRole, moderatorAccounts, addLog, currentModeratorId, currentModeratorLabel]);

  // Permanently delete a moderator account
  const deleteModeratorAccount = useCallback((accountId: string) => {
    if (moderatorRole !== 'ultime') return;
    console.log('Seranova: Deleting moderator account:', accountId);
    setModeratorAccounts(prev => prev.filter(a => a.id !== accountId));
    setModerationTasks(prev => prev.filter(t => t.assignedTo !== accountId));
  }, [moderatorRole]);

  // Assign a publication to a moderator
  // SQL: INSERT INTO moderation_tasks (publication_id, assigned_to, assigned_by, ...)
  const assignPublicationToModerator = useCallback((publicationId: string, targetAccountId: string): boolean => {
    if (moderatorRole !== 'ultime') return false;
    const allAccounts = [...BUILTIN_ACCOUNTS, ...moderatorAccounts];
    const target = allAccounts.find(a => a.id === targetAccountId);
    if (!target || target.isRevoked) return false;

    // Prevent duplicate active assignment for same pub + moderator
    const existing = moderationTasks.find(
      t => t.publicationId === publicationId && t.assignedTo === targetAccountId && t.status === 'pending'
    );
    if (existing) return false;

    const task: ModerationTask = {
      id: `task-${Date.now()}`,
      publicationId,
      assignedTo: targetAccountId,
      assignedToLabel: target.label,
      assignedBy: currentModeratorId,
      assignedByLabel: currentModeratorLabel,
      status: 'pending',
      decision: null,
      comment: '',
      assignedAt: new Date().toISOString(),
      decidedAt: null,
    };

    console.log('Seranova: Assigning pub', publicationId, 'to', target.label);
    setModerationTasks(prev => [task, ...prev]);
    addLog('assigned', publicationId, `Assigné à "${target.label}" (${target.identifier})`, currentModeratorId, currentModeratorLabel);
    return true;
  }, [moderatorRole, moderatorAccounts, moderationTasks, currentModeratorId, currentModeratorLabel, addLog]);

  // Submit a moderation decision on an assigned task
  // SQL: UPDATE moderation_tasks SET status='done', decision=?, decided_at=? WHERE id=?
  // SQL: UPDATE publications SET status=? WHERE id=?
  const submitModerationDecision = useCallback((
    taskId: string,
    decision: 'approved' | 'rejected',
    comment: string = '',
  ) => {
    if (!isModerator) return;
    const task = moderationTasks.find(t => t.id === taskId);
    if (!task) return;

    console.log('Seranova: Task decision:', taskId, decision);
    setModerationTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'done' as const, decision, comment, decidedAt: new Date().toISOString() }
        : t
    ));
    setPublications(prev => prev.map(p =>
      p.id === task.publicationId ? { ...p, status: decision === 'approved' ? 'approved' as const : 'rejected' as const } : p
    ));
    addLog(
      decision,
      task.publicationId,
      comment ? `Décision: ${decision === 'approved' ? 'approuvé' : 'refusé'} — "${comment}"` : `Décision: ${decision === 'approved' ? 'approuvé' : 'refusé'}`,
      currentModeratorId,
      currentModeratorLabel,
    );
  }, [isModerator, moderationTasks, addLog, currentModeratorId, currentModeratorLabel]);

  const resetData = useCallback(async () => {
    console.log('Seranova: Resetting all data');
    setPublications(MOCK_PUBLICATIONS);
    setReports([]);
    setReactions({});
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.publications),
      AsyncStorage.removeItem(STORAGE_KEYS.reports),
      AsyncStorage.removeItem(STORAGE_KEYS.reactions),
    ]);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    console.log('Seranova: Settings updated:', partial);
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((updates: { name?: string; bio?: string; avatarUrl?: string }) => {
    console.log('Seranova: Profile updated');
    setUserProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleReaction = useCallback((pubId: string, type: ReactionType) => {
    setReactions(prev => {
      const current = prev[pubId] || [];
      const has = current.includes(type);
      return {
        ...prev,
        [pubId]: has ? current.filter(r => r !== type) : [...current, type],
      };
    });
  }, []);

  const dismissInstantPositif = useCallback(() => {
    setShowInstantPositif(false);
  }, []);

  return {
    currentUser,
    publications,
    approvedPublications,
    pendingPublications,
    userPublications,
    galleryPublications,
    videoPublications,
    aiFlaggedPublications,
    aiValidatedPublications,
    reports,
    isModerator,
    moderatorRole,
    currentModeratorId,
    currentModeratorLabel,
    currentModeratorPermissions,
    allModeratorAccounts,
    moderatorAccounts,
    moderationTasks,
    myAssignedTasks,
    moderationLogs,
    isLoaded,
    addPublication,
    editPublication,
    deletePublication,
    moderatorDeletePublication,
    approvePublication,
    rejectPublication,
    reportPublication,
    loginModerator,
    logoutModerator,
    createModeratorAccount,
    revokeModeratorAccess,
    deleteModeratorAccount,
    assignPublicationToModerator,
    submitModerationDecision,
    resetData,
    settings,
    updateSettings,
    colors,
    textScale,
    t,
    updateProfile,
    reactions,
    toggleReaction,
    showInstantPositif,
    dismissInstantPositif,
  };
});
