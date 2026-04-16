import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getAppLanguageSetting, saveAppLanguageSetting } from '../services/settingsService';
import { AppLanguage } from '../types';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>('am');

  useEffect(() => {
    getAppLanguageSetting()
      .then(setLanguageState)
      .catch(() => {
        setLanguageState('am');
      });
  }, []);

  function setLanguage(languageValue: AppLanguage) {
    setLanguageState(languageValue);
    saveAppLanguageSetting(languageValue).catch(() => {
      // Keep in-memory value even if remote save fails.
    });
  }

  function toggleLanguage() {
    setLanguage(language === 'am' ? 'en' : 'am');
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useAppLanguage must be used within LanguageProvider');
  }

  return context;
}
