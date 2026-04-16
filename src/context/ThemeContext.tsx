import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppPalette, AppThemeMode, getPalette } from '../theme/colors';

const THEME_STORAGE_KEY = 'jc_theme_mode_v1';

type ThemeContextValue = {
  mode: AppThemeMode;
  palette: AppPalette;
  isDark: boolean;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setMode(stored);
          return;
        }

        const systemMode = Appearance.getColorScheme();
        setMode(systemMode === 'dark' ? 'dark' : 'light');
      })
      .catch(() => {
        const systemMode = Appearance.getColorScheme();
        setMode(systemMode === 'dark' ? 'dark' : 'light');
      });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const palette = getPalette(mode);

    return {
      mode,
      palette,
      isDark: mode === 'dark',
      toggleMode: () => {
        setMode((current) => {
          const next = current === 'dark' ? 'light' : 'dark';
          AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
            // Ignore storage errors and still apply the in-memory theme.
          });
          return next;
        });
      },
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return ctx;
}
