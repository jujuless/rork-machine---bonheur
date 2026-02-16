export interface User {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  isModerator: boolean;
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
