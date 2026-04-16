import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '../context/ThemeContext';
import { useAppLanguage } from '../context/LanguageContext';
import {
  DEFAULT_PAGE_CONTENT,
  DEFAULT_PAGE_CONTENT_EN,
  DEFAULT_PAGE_TEXT_STYLE,
  getPageContentSettingsByLanguage,
  getPageTextStyleSettings,
} from '../services/settingsService';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { TextStyleSettings } from '../types';

export function CopyrightFooter() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const [text, setText] = useState(
    isEnglish ? DEFAULT_PAGE_CONTENT_EN.copyrightText : DEFAULT_PAGE_CONTENT.copyrightText,
  );
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);

  const normalizedText = text.replace(/\(c\)/gi, '©');

  const loadCopyright = useCallback(() => {
    Promise.all([getPageContentSettingsByLanguage(language), getPageTextStyleSettings()])
      .then(([data, style]) => {
        const fallbackText = isEnglish ? DEFAULT_PAGE_CONTENT_EN.copyrightText : DEFAULT_PAGE_CONTENT.copyrightText;
        setText(data.copyrightText || fallbackText);
        setPageTextStyle(style);
      })
      .catch(() => {
        // Keep default value if settings load fails.
      });
  }, [isEnglish, language]);

  useEffect(() => {
    loadCopyright();
  }, [loadCopyright]);

  useFocusEffect(
    useCallback(() => {
      loadCopyright();
    }, [loadCopyright]),
  );

  return (
    <View style={[styles.wrap, { backgroundColor: palette.footerBackground }]}>
      <Text numberOfLines={2} style={[styles.text, { color: palette.inverseText }, buildFormattedTextStyle(pageTextStyle)]}>
        {normalizedText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F172AAA',
  },
  text: {
    color: '#F8FAFC',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
