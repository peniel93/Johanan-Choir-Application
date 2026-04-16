export type AppThemeMode = 'light' | 'dark';

export type AppPalette = {
  blue900: string;
  blue700: string;
  blue500: string;
  sky100: string;
  white: string;
  textDark: string;
  textMuted: string;
  danger: string;
  success: string;
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  inputBorder: string;
  softAccentBackground: string;
  softAccentText: string;
  inverseText: string;
  headerBackground: string;
  chipBackground: string;
  chipBorder: string;
  chipActiveBackground: string;
  chipActiveText: string;
  footerBackground: string;
};

export const lightPalette: AppPalette = {
  blue900: '#0A2E6E',
  blue700: '#134CA8',
  blue500: '#2F6EE5',
  sky100: '#EAF3FF',
  white: '#FFFFFF',
  textDark: '#0F172A',
  textMuted: '#475569',
  danger: '#B91C1C',
  success: '#0F766E',
  pageBackground: '#EFF6FF',
  cardBackground: '#FFFFFFEA',
  cardBorder: '#DBEAFE',
  inputBorder: '#BFDBFE',
  softAccentBackground: '#DBEAFE',
  softAccentText: '#1E3A8A',
  inverseText: '#F8FAFC',
  headerBackground: '#0A2E6E',
  chipBackground: '#F8FBFF',
  chipBorder: '#93C5FD',
  chipActiveBackground: '#1D4ED8',
  chipActiveText: '#FFFFFF',
  footerBackground: '#0F172AAA',
};

export const darkPalette: AppPalette = {
  blue900: '#BFDBFE',
  blue700: '#93C5FD',
  blue500: '#60A5FA',
  sky100: '#0B1220',
  white: '#F8FAFC',
  textDark: '#E2E8F0',
  textMuted: '#94A3B8',
  danger: '#FCA5A5',
  success: '#5EEAD4',
  pageBackground: '#070F1D',
  cardBackground: '#111C2FCC',
  cardBorder: '#1E3A5F',
  inputBorder: '#2A4A73',
  softAccentBackground: '#102746',
  softAccentText: '#BFDBFE',
  inverseText: '#E2E8F0',
  headerBackground: '#081326',
  chipBackground: '#102746',
  chipBorder: '#1D4E89',
  chipActiveBackground: '#2563EB',
  chipActiveText: '#F8FAFC',
  footerBackground: '#020817CC',
};

export function getPalette(mode: AppThemeMode): AppPalette {
  return mode === 'dark' ? darkPalette : lightPalette;
}

// Backward-compatible alias for files that still rely on the old static token object.
export const colors = lightPalette;
