import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Publication, Report, ReportReason, User, AppSettings, ReactionType, ColorTheme, ModeratorRole, ModeratorCode, AIAnalysisResult, AIGrade } from '@/types';
import { DarkColors, LightColors } from '@/constants/colors';
import { translations, TranslationStrings } from '@/constants/translations';
import { MOCK_PUBLICATIONS } from '@/mocks/publications';

const STORAGE_KEYS = {
  publications: 'seranova_publications',
  reports: 'seranova_reports',
  settings: 'seranova_settings',
  profile: 'seranova_profile',
  reactions: 'seranova_reactions',
  moderatorCodes: 'seranova_moderator_codes',
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

const BUILTIN_CODES: Record<string, ModeratorRole> = {
  'Modérateur123': 'ultime',
  'MAB01': 'standard',
};

function generateAIAnalysis(text: string, hasMedia: boolean, isVideo: boolean): AIAnalysisResult {
  const textLength = text.trim().length;
  const hookPresent = text.includes('?') || textLength > 60 || /^[A-Z]/.test(text.trim());
  const ctaPresent = text.includes('!') || /partage|commente|dis-moi|réponds|clique/i.test(text);

  const base = 35;
  const textBonus = Math.min(textLength / 4, 22);
  const mediaBonus = hasMedia ? 14 : 0;
  const videoBonus = isVideo ? 12 : 0;
  const hookBonus = hookPresent ? 10 : 0;
  const ctaBonus = ctaPresent ? 7 : 0;

  const rawScore = base + textBonus + mediaBonus + videoBonus + hookBonus + ctaBonus;
  const score = Math.min(Math.round(rawScore), 100);

  let grade: AIGrade;
  if (score >= 80) grade = 'excellent';
  else if (score >= 60) grade = 'good';
  else if (score >= 40) grade = 'average';
  else grade = 'poor';

  const clarity = Math.min(10, Math.round(2 + textLength / 25));
  const structure = Math.min(10, Math.round((hasMedia ? 5 : 3) + (isVideo ? 3 : 1) + (hookPresent ? 1 : 0) + (ctaPresent ? 1 : 0)));
  const estimatedRetention = Math.round(25 + score * 0.55);

  const feedbacks: string[] = [];
  if (!hookPresent) feedbacks.push('Commencez par une question ou une affirmation forte pour capter l\'attention');
  if (!ctaPresent) feedbacks.push('Ajoutez un appel à l\'action pour encourager l\'engagement');
  if (textLength < 40) feedbacks.push('Développez votre message — plus de contexte = plus d\'impact');
  if (!hasMedia) feedbacks.push('Une image ou vidéo augmente la rétention de 3×');
  if (isVideo && score < 60) feedbacks.push('Soignez les 3 premières secondes de votre vidéo (hook visuel)');
  if (score >= 75) feedbacks.push('Excellent travail ! Ce contenu a un fort potentiel d\'engagement.');
  if (feedbacks.length === 0) feedbacks.push('Bon contenu. Peaufinez le hook pour atteindre l\'excellence.');

  return {
    id: `ai-${Date.now()}`,
    publicationId: '',
    score,
    grade,
    hook: hookPresent,
    clarity,
    structure,
    callToAction: ctaPresent,
    estimatedRetention,
    feedbacks,
    analyzedAt: new Date().toISOString(),
  };
}

export { generateAIAnalysis };

export const [AppProvider, useApp] = createContextHook(() => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorRole, setModeratorRole] = useState<ModeratorRole | null>(null);
  const [moderatorCodes, setModeratorCodes] = useState<ModeratorCode[]>([]);
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedPubs, storedReports, storedSettings, storedProfile, storedReactions, storedModCodes] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.publications),
          AsyncStorage.getItem(STORAGE_KEYS.reports),
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.reactions),
          AsyncStorage.getItem(STORAGE_KEYS.moderatorCodes),
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
        if (storedModCodes) setModeratorCodes(JSON.parse(storedModCodes) as ModeratorCode[]);
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
      AsyncStorage.setItem(STORAGE_KEYS.moderatorCodes, JSON.stringify(moderatorCodes))
        .catch(err => console.log('Seranova: Error saving moderator codes:', err));
    }
  }, [moderatorCodes, isLoaded]);

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
    () => publications.filter(p => aiReportedIds.has(p.id)),
    [publications, aiReportedIds]
  );

  const aiValidatedPublications = useMemo(
    () => pendingPublications.filter(p => !aiReportedIds.has(p.id)),
    [pendingPublications, aiReportedIds]
  );

  const addPublication = useCallback((text: string, mediaUrl?: string, isVideo?: boolean, aiAnalysis?: AIAnalysisResult) => {
    const newPub: Publication = {
      id: `pub-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      text,
      imageUrl: !isVideo ? mediaUrl : undefined,
      videoUrl: isVideo ? mediaUrl : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      aiAnalysis,
    };
    console.log('Seranova: Adding publication:', newPub.id, 'AI score:', aiAnalysis?.score);
    setPublications(prev => [newPub, ...prev]);
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
    setPublications(prev => prev.filter(p => p.id !== id));
    setReports(prev => prev.filter(r => r.publicationId !== id));
  }, [isModerator]);

  const approvePublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('Seranova: Approving publication:', id);
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved' as const } : p
    ));
  }, [isModerator]);

  const rejectPublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('Seranova: Rejecting publication:', id);
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'rejected' as const } : p
    ));
  }, [isModerator]);

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

  const loginModerator = useCallback((_username: string, password: string): boolean => {
    const builtinRole = BUILTIN_CODES[password];
    if (builtinRole) {
      console.log('Seranova: Moderator logged in with role:', builtinRole);
      setIsModerator(true);
      setModeratorRole(builtinRole);
      return true;
    }
    const dynCode = moderatorCodes.find(c => c.code === password);
    if (dynCode) {
      console.log('Seranova: Moderator logged in with dynamic code, role:', dynCode.role);
      setIsModerator(true);
      setModeratorRole(dynCode.role);
      return true;
    }
    console.log('Seranova: Moderator login failed');
    return false;
  }, [moderatorCodes]);

  const logoutModerator = useCallback(() => {
    console.log('Seranova: Moderator logged out');
    setIsModerator(false);
    setModeratorRole(null);
  }, []);

  const createModeratorCode = useCallback((code: string, role: ModeratorRole, label: string): boolean => {
    if (moderatorRole !== 'ultime') return false;
    const allExisting = [
      ...Object.keys(BUILTIN_CODES),
      ...moderatorCodes.map(c => c.code),
    ];
    if (allExisting.includes(code)) {
      console.log('Seranova: Code already exists');
      return false;
    }
    const newCode: ModeratorCode = {
      id: `modcode-${Date.now()}`,
      code,
      role,
      label,
      createdAt: new Date().toISOString(),
    };
    console.log('Seranova: Creating moderator code:', newCode.id, role);
    setModeratorCodes(prev => [...prev, newCode]);
    return true;
  }, [moderatorRole, moderatorCodes]);

  const deleteModeratorCode = useCallback((id: string) => {
    if (moderatorRole !== 'ultime') return;
    console.log('Seranova: Deleting moderator code:', id);
    setModeratorCodes(prev => prev.filter(c => c.id !== id));
  }, [moderatorRole]);

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
    moderatorCodes,
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
    createModeratorCode,
    deleteModeratorCode,
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
