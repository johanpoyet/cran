// Design tokens, direction "B — Clair & doux" (docs/SPEC.md section 7, docs/design/).
// Screens and components never hard-code colours, sizes or fonts: they read them from here.

export const colors = {
  bg: '#F3F4F8',
  surface: '#FFFFFF',
  text: '#14161F',
  textMuted: '#5E6475',
  border: '#E3E5EC',
  accent: '#3554F5',
  accentSoft: '#EEF1FF',
  onAccent: '#FFFFFF',
  protein: '#E8701A',
  proteinSoft: '#FFF1E6',
  carbs: '#1F9E86',
  carbsSoft: '#E6F6F2',
  fat: '#9B6BE0',
  fatSoft: '#F2ECFC',
  water: '#3FA9F5',
  success: '#0E6B58',
  danger: '#C0362C',
  track: '#E9EBF1',
  /** Separator on the accent hero card. */
  onAccentDivider: 'rgba(255, 255, 255, 0.3)',
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  hero: 28,
  card: 22,
  tile: 16,
  icon: 12,
  pill: 999,
} as const;

export const space = {
  4: 4,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  /** Horizontal screen margin. */
  screen: 20,
} as const;

// Custom fonts need one family per weight: fontWeight alone does not pick the file.
export const fontFamily = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fontFamily;

// Measured on the @2x mockups (390 × 844 pt).
export const typography = {
  display: { fontSize: 44, lineHeight: 50, weight: 800 },
  title: { fontSize: 28, lineHeight: 34, weight: 800 },
  heading: { fontSize: 20, lineHeight: 26, weight: 700 },
  lead: { fontSize: 18, lineHeight: 24, weight: 500 },
  body: { fontSize: 16, lineHeight: 22, weight: 500 },
  label: { fontSize: 15, lineHeight: 20, weight: 600 },
  caption: { fontSize: 13, lineHeight: 18, weight: 500 },
} as const satisfies Record<string, { fontSize: number; lineHeight: number; weight: FontWeight }>;

export type TypographyVariant = keyof typeof typography;

export const shadow = {
  floating: '0px 8px 24px rgba(20, 22, 31, 0.10)',
  card: '0px 1px 2px rgba(20, 22, 31, 0.04)',
  /** Blue glow under the logo on the sign-in screen. */
  logo: '0px 12px 32px rgba(53, 84, 245, 0.25)',
} as const;

export const touch = {
  /** Minimum touch target (Apple HIG). */
  minSize: 44,
} as const;

export const control = {
  /** Height of buttons and text fields. */
  height: 52,
  iconTile: 36,
  iconSize: 20,
  /** Round buttons: back arrow, stepper − and +. */
  round: 52,
  radio: 24,
  checkbox: 26,
  dayHeight: 48,
} as const;

export const ruler = {
  /** Distance between two ticks. */
  tickSpacing: 11,
  tickWidth: 2,
  minorHeight: 28,
  majorHeight: 40,
  cursorHeight: 56,
} as const;

export const tabBar = {
  height: 68,
  actionSize: 52,
  iconSize: 24,
} as const;
