import type { ToxicityCategory, DangerLevel } from '@/utils/contentFilter';

export type { ToxicityCategory, DangerLevel };

export interface User {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  isModerator: boolean;
  role?: UserRole;
  plan?: UserPlan;
}

export interface Publication {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  aiAnalysis?: AIAnalysisResult;
}

export interface Report {
  id: string;
  publicationId: string;
  reporterId: string;
  reason: ReportReason;
  description: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
}

export type ReportReason = 'fake_news' | 'insults' | 'nudity' | 'ai_content' | 'other';
export type PublicationStatus = Publication['status'];
export type ReactionType = 'seedling' | 'smile' | 'heart';
export type ModeratorRole = 'ultime' | 'standard' | 'ia_validator';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserPlan = 'free' | 'pro' | 'team';

export interface ModeratorCode {
  id: string;
  code: string;
  role: ModeratorRole;
  label: string;
  createdAt: string;
}

export interface AppSettings {
  language: 'fr' | 'en';
  theme: 'dark' | 'light';
  textSize: 'small' | 'medium' | 'large';
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
}

export interface PresetImage {
  id: string;
  url: string;
  label: string;
}

export interface DemoVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  authorName: string;
}

export interface InspiringQuote {
  text: string;
  author: string;
}

export type AIGrade = 'safe' | 'warning' | 'dangerous' | 'critical';

export interface AIAnalysisResult {
  id: string;
  publicationId: string;
  score: number;
  grade: AIGrade;
  dangerLevel: DangerLevel;
  categories: ToxicityCategory[];
  recommendation: 'allow' | 'review' | 'block';
  feedbacks: string[];
  analyzedAt: string;
}

export interface MABScore {
  clarity: number;
  action: number;
  progression: number;
  meaning: number;
  overall: number;
}

export interface FeatureFlags {
  maxVideosAnalyzable: number;
  deepFeedback: boolean;
  adminDashboard: boolean;
  createModeratorAccounts: boolean;
}

export const PLAN_FLAGS: Record<UserPlan, FeatureFlags> = {
  free: {
    maxVideosAnalyzable: 3,
    deepFeedback: false,
    adminDashboard: false,
    createModeratorAccounts: false,
  },
  pro: {
    maxVideosAnalyzable: 30,
    deepFeedback: true,
    adminDashboard: true,
    createModeratorAccounts: false,
  },
  team: {
    maxVideosAnalyzable: -1,
    deepFeedback: true,
    adminDashboard: true,
    createModeratorAccounts: true,
  },
};

export interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  pending: string;
  pendingLight: string;
  white: string;
  overlay: string;
  glow: string;
  glowStrong: string;
}
