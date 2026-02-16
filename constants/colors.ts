import { ColorTheme } from '@/types';

export const DarkColors: ColorTheme = {
  primary: '#4ADE80',
  primaryLight: '#122A1B',
  primaryDark: '#16A34A',
  accent: '#86EFAC',
  accentLight: '#0F1F15',
  background: '#080C0A',
  surface: '#111916',
  surfaceLight: '#1A2620',
  text: '#E8F5EC',
  textSecondary: '#8AAFA0',
  textMuted: '#4A6B5A',
  border: '#1C3026',
  success: '#22C55E',
  successLight: '#0D2818',
  danger: '#EF4444',
  dangerLight: '#2D1111',
  pending: '#F59E0B',
  pendingLight: '#2D2206',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.75)',
  glow: 'rgba(74, 222, 128, 0.08)',
  glowStrong: 'rgba(74, 222, 128, 0.15)',
};

export const LightColors: ColorTheme = {
  primary: '#16A34A',
  primaryLight: '#DCFCE7',
  primaryDark: '#15803D',
  accent: '#22C55E',
  accentLight: '#F0FDF4',
  background: '#F5FAF7',
  surface: '#FFFFFF',
  surfaceLight: '#EDF5F0',
  text: '#1A2E23',
  textSecondary: '#5A7A6A',
  textMuted: '#94B3A3',
  border: '#D4E5DA',
  success: '#22C55E',
  successLight: '#DCFCE7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  pending: '#F59E0B',
  pendingLight: '#FEF3C7',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  glow: 'rgba(22, 163, 74, 0.08)',
  glowStrong: 'rgba(22, 163, 74, 0.15)',
};

const Colors = DarkColors;
export default Colors;
