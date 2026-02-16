import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Publication, Report, ReportReason, User, AppSettings, ReactionType, ColorTheme } from '@/types';
import { DarkColors, LightColors } from '@/constants/colors';
import { translations, TranslationStrings } from '@/constants/translations';
import { MOCK_PUBLICATIONS } from '@/mocks/publications';

const STORAGE_KEYS = {
  publications: 'mab_publications',
  reports: 'mab_reports',
  settings: 'mab_settings',
  profile: 'mab_profile',
  reactions: 'mab_reactions',
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

export const [AppProvider, useApp] = createContextHook(() => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isModerator, setIsModerator] = useState(false);
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
        const [storedPubs, storedReports, storedSettings, storedProfile, storedReactions] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.publications),
          AsyncStorage.getItem(STORAGE_KEYS.reports),
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.profile),
          AsyncStorage.getItem(STORAGE_KEYS.reactions),
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

  const loginModerator = useCallback((username: string, password: string): boolean => {
    if (username === 'Jules' && password === '123') {
      console.log('MAB: Moderator logged in');
      setIsModerator(true);
      return true;
    }
    console.log('MAB: Moderator login failed');
    return false;
  }, []);

  const logoutModerator = useCallback(() => {
    console.log('MAB: Moderator logged out');
    setIsModerator(false);
  }, []);

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
    reports,
    isModerator,
    isLoaded,
    addPublication,
    editPublication,
    deletePublication,
    approvePublication,
    rejectPublication,
    reportPublication,
    loginModerator,
    logoutModerator,
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
