import '@/global.css';

import { Platform } from 'react-native';

export const HeadingFont = {
  semiBold: 'PlayfairDisplay_600SemiBold',
  bold: 'PlayfairDisplay_700Bold',
} as const;

export const Colors = {
  background: '#F7F3EC',
  surface: '#FFFFFF',
  primary: '#0F3D3E',
  primaryDark: '#0A2C2C',
  onPrimary: '#FFFFFF',
  text: '#152F2E',
  textSecondary: '#5C6E6C',
  border: '#E7E1D5',
  mint: '#8FD1BC',
  mintSoft: '#DCEEE7',
  orange: '#F0A94E',
  orangeSoft: '#FBEBD3',
  blue: '#3E8ED0',
  blueSoft: '#DDEBF8',
  purple: '#9B6FD1',
  green: '#5FAE7A',
  danger: '#D97757',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 480;
