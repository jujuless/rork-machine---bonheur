import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Publication, Report, ReportReason, User, AppSettings, ReactionType, ColorTheme, ModeratorRole, ModeratorCode } from '@/types';
import { DarkColors, LightColors } from '@/constants/colors';
import { translations, TranslationStrings } from '@/constants/translations';
import { MOCK_PUBLICATIONS } from '@/mocks/publications';

const STORAGE_KEYS = {
  publications: 'mab_publications',
  reports: 'mab_reports',
  settings: 'mab_settings',
  profile: 'mab_profile',
  reactions: 'mab_reactions',
  moderatorCodes: 'mab_moderator_codes',
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

        if (storedReports) {
          setReports(JSON.parse(storedReports) as Report[]);
        }

        if (storedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        }

        if (storedProfile) {
          setUserProfile({ ...DEFAULT_PROFILE, ...JSON.parse(storedProfile) });
        }

        if (storedReactions) {
          setReactions(JSON.parse(storedReactions));
        }

        if (storedModCodes) {
          setModeratorCodes(JSON.parse(storedModCodes) as ModeratorCode[]);
        }
      } catch (error) {
        console.log('MAB: Error loading data:', error);
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
        .catch(err => console.log('MAB: Error saving publications:', err));
    }
  }, [publications, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports))
        .catch(err => console.log('MAB: Error saving reports:', err));
    }
  }, [reports, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
        .catch(err => console.log('MAB: Error saving settings:', err));
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(userProfile))
        .catch(err => console.log('MAB: Error saving profile:', err));
    }
  }, [userProfile, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.reactions, JSON.stringify(reactions))
        .catch(err => console.log('MAB: Error saving reactions:', err));
    }
  }, [reactions, isLoaded]);

  useEffect(() => {
    if (!isInitialLoad.current && isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.moderatorCodes, JSON.stringify(moderatorCodes))
        .catch(err => console.log('MAB: Error saving moderator codes:', err));
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

  const addPublication = useCallback((text: string, imageUrl?: string) => {
    const newPub: Publication = {
      id: `pub-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      text,
      imageUrl: imageUrl || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    console.log('MAB: Adding publication:', newPub.id);
    setPublications(prev => [newPub, ...prev]);
  }, [currentUser.id, currentUser.name]);

  const editPublication = useCallback((id: string, text: string, imageUrl?: string) => {
    console.log('MAB: Editing publication:', id);
    setPublications(prev => prev.map(p =>
      p.id === id && p.authorId === currentUser.id
        ? { ...p, text, imageUrl: imageUrl || p.imageUrl, status: 'pending' as const }
        : p
    ));
  }, [currentUser.id]);

  const deletePublication = useCallback((id: string) => {
    console.log('MAB: Deleting publication:', id);
    setPublications(prev => prev.filter(p =>
      !(p.id === id && p.authorId === currentUser.id)
    ));
  }, [currentUser.id]);

  const approvePublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('MAB: Approving publication:', id);
    setPublications(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'approved' as const } : p
    ));
  }, [isModerator]);

  const rejectPublication = useCallback((id: string) => {
    if (!isModerator) return;
    console.log('MAB: Rejecting publication:', id);
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
    console.log('MAB: Reporting publication:', publicationId);
    setReports(prev => [newReport, ...prev]);
  }, [currentUser.id]);

  const loginModerator = useCallback((_username: string, password: string): boolean => {
    const builtinRole = BUILTIN_CODES[password];
    if (builtinRole) {
      console.log('MAB: Moderator logged in with role:', builtinRole);
      setIsModerator(true);
      setModeratorRole(builtinRole);
      return true;
    }
    const dynCode = moderatorCodes.find(c => c.code === password);
    if (dynCode) {
      console.log('MAB: Moderator logged in with dynamic code, role:', dynCode.role);
      setIsModerator(true);
      setModeratorRole(dynCode.role);
      return true;
    }
    console.log('MAB: Moderator login failed');
    return false;
  }, [moderatorCodes]);

  const logoutModerator = useCallback(() => {
    console.log('MAB: Moderator logged out');
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
      console.log('MAB: Code already exists');
      return false;
    }
    const newCode: ModeratorCode = {
      id: `modcode-${Date.now()}`,
      code,
      role,
      label,
      createdAt: new Date().toISOString(),
    };
    console.log('MAB: Creating moderator code:', newCode.id, role);
    setModeratorCodes(prev => [...prev, newCode]);
    return true;
  }, [moderatorRole, moderatorCodes]);

  const deleteModeratorCode = useCallback((id: string) => {
    if (moderatorRole !== 'ultime') return;
    console.log('MAB: Deleting moderator code:', id);
    setModeratorCodes(prev => prev.filter(c => c.id !== id));
  }, [moderatorRole]);

  const resetData = useCallback(async () => {
    console.log('MAB: Resetting all data');
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
    console.log('MAB: Settings updated:', partial);
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((updates: { name?: string; bio?: string; avatarUrl?: string }) => {
    console.log('MAB: Profile updated');
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
