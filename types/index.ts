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

export type ModeratorPermission = 'view' | 'approve' | 'reject' | 'comment';

// SQL equivalent:
// CREATE TABLE moderator_accounts (
//   id TEXT PRIMARY KEY,
//   identifier TEXT UNIQUE NOT NULL,
//   code TEXT NOT NULL,
//   role TEXT NOT NULL,
//   permissions TEXT NOT NULL, -- JSON array
//   label TEXT NOT NULL,
//   created_by TEXT NOT NULL,
//   created_at TEXT NOT NULL,
//   is_revoked BOOLEAN DEFAULT FALSE,
//   is_builtin BOOLEAN DEFAULT FALSE
// );
export interface ModeratorAccount {
  id: string;
  identifier: string;
  code: string;
  role: ModeratorRole;
  permissions: ModeratorPermission[];
  label: string;
  createdBy: string;
  createdAt: string;
  isRevoked: boolean;
  isBuiltin: boolean;
}

// SQL equivalent:
// CREATE TABLE moderation_tasks (
//   id TEXT PRIMARY KEY,
//   publication_id TEXT NOT NULL REFERENCES publications(id),
//   assigned_to TEXT NOT NULL REFERENCES moderator_accounts(id),
//   assigned_to_label TEXT NOT NULL,
//   assigned_by TEXT NOT NULL REFERENCES moderator_accounts(id),
//   assigned_by_label TEXT NOT NULL,
//   status TEXT DEFAULT 'pending', -- pending | done
//   decision TEXT, -- approved | rejected | NULL
//   comment TEXT DEFAULT '',
//   assigned_at TEXT NOT NULL,
//   decided_at TEXT
// );
export interface ModerationTask {
  id: string;
  publicationId: string;
  assignedTo: string;
  assignedToLabel: string;
  assignedBy: string;
  assignedByLabel: string;
  status: 'pending' | 'done';
  decision: 'approved' | 'rejected' | null;
  comment: string;
  assignedAt: string;
  decidedAt: string | null;
}

// SQL equivalent:
// CREATE TABLE moderation_logs (
//   id TEXT PRIMARY KEY,
//   moderator_id TEXT NOT NULL,
//   moderator_label TEXT NOT NULL,
//   publication_id TEXT,
//   action TEXT NOT NULL,
//   detail TEXT NOT NULL,
//   timestamp TEXT NOT NULL
// );
export interface ModerationLog {
  id: string;
  moderatorId: string;
  moderatorLabel: string;
  publicationId: string;
  action: 'approved' | 'rejected' | 'assigned' | 'account_created' | 'account_revoked' | 'commented';
  detail: string;
  timestamp: string;
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
