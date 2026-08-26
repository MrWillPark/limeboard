/**
 * LimeBoard design tokens
 * Ultra-dark cockpit + electric lime metrics
 */

import type { Theme } from 'expo-router';

export const colors = {
  bg: '#0B0E0D',
  bgElevated: '#101412',
  panel: '#141917',
  panelHover: '#1A211E',
  border: '#1F2A26',
  borderStrong: '#2A3A34',

  lime: '#39FF14',
  limeSoft: '#A3E635',
  limeDim: 'rgba(57, 255, 20, 0.14)',
  limeGlow: 'rgba(57, 255, 20, 0.35)',

  amber: '#F59E0B',
  amberDim: 'rgba(245, 158, 11, 0.16)',
  red: '#F43F5E',
  redDim: 'rgba(244, 63, 94, 0.14)',

  text: '#F2F7F4',
  textSecondary: '#9AADA3',
  textMuted: '#5E7369',
  textInverse: '#0B0E0D',

  chart: ['#39FF14', '#A3E635', '#4ADE80', '#22D3EE', '#F59E0B', '#A78BFA', '#F472B6'],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fonts = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemi: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const LimeBoardDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.lime,
    background: colors.bg,
    card: colors.panel,
    text: colors.text,
    border: colors.border,
    notification: colors.amber,
  },
  fonts: {
    regular: { fontFamily: fonts.sans, fontWeight: '400' },
    medium: { fontFamily: fonts.sansMedium, fontWeight: '500' },
    bold: { fontFamily: fonts.sansBold, fontWeight: '700' },
    heavy: { fontFamily: fonts.sansBold, fontWeight: '700' },
  },
};
