import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  DEFAULT_PAGE_CONTENT,
  DEFAULT_PAGE_CONTENT_EN,
  DEFAULT_PAGE_TEXT_STYLE,
  getPageContentSettingsByLanguage,
  getPageTextStyleSettings,
} from '../services/settingsService';
import { AppPalette } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { PageContentSettings, TextStyleSettings } from '../types';

export function ServicesScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const topOffset = width < 420 ? 24 : 40;
  const cardMaxWidth = width < 900 ? 760 : 900;
  const [content, setContent] = useState<PageContentSettings>(isEnglish ? DEFAULT_PAGE_CONTENT_EN : DEFAULT_PAGE_CONTENT);
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadContent = useCallback(() => {
    Promise.all([getPageContentSettingsByLanguage(language), getPageTextStyleSettings()])
      .then(([pageContent, textStyle]) => {
        setContent(pageContent);
        setPageTextStyle(textStyle);
      })
      .catch(() => {
        // Keep defaults when settings are unavailable.
      });
  }, [language]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, language]);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [loadContent]),
  );

  return (
    <ChoirBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingTop: topOffset }]}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      > 
        <Animated.View
          style={[
            styles.heroCard,
            {
              maxWidth: cardMaxWidth,
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={16} color={palette.blue700} />
            <Text style={styles.heroBadgeText}>{isEnglish ? 'What You Can Do' : 'ምን ማድረግ ይችላሉ'}</Text>
          </View>
          <Text style={[styles.title, buildFormattedTextStyle(pageTextStyle)]}>{content.servicesTitle}</Text>
          <Text style={[styles.subtitle, buildFormattedTextStyle(pageTextStyle)]}>
            {isEnglish
              ? 'Everything is designed for fast worship preparation, organized content, and smooth collaboration.'
              : 'ሁሉም ነገር ፈጣን የአምልኮ ዝግጅት፣ የተደራጀ ይዘት እና ቀላል ትብብር እንዲኖር ተዘጋጅቷል።'}
          </Text>
        </Animated.View>

        {content.servicesItems.map((item, index) => {
          const iconName: keyof typeof Ionicons.glyphMap =
            index % 4 === 0
              ? 'search-outline'
              : index % 4 === 1
                ? 'musical-notes-outline'
                : index % 4 === 2
                  ? 'heart-outline'
                  : 'cloud-offline-outline';

          return (
            <Animated.View
              key={`${item}-${index}`}
              style={[
                styles.serviceCard,
                {
                  maxWidth: cardMaxWidth,
                  opacity: entrance,
                  transform: [
                    {
                      translateY: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [36 + index * 10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={iconName} size={18} color={palette.blue700} />
              </View>
              <Text style={[styles.item, buildFormattedTextStyle(pageTextStyle)]}>{item}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>
      <ScrollToTopButton visible={showScrollTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
    </ChoirBackground>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      paddingHorizontal: 12,
      paddingBottom: 24,
      gap: 10,
    },
    heroCard: {
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      width: '100%',
      alignSelf: 'center',
      marginBottom: 2,
      shadowColor: '#0F172A',
      shadowOpacity: 0.13,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.chipBorder,
      backgroundColor: palette.chipBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
    },
    heroBadgeText: {
      fontSize: 12,
      color: palette.blue700,
      fontWeight: '700',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.blue900,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 22,
      color: palette.textMuted,
      fontWeight: '600',
    },
    serviceCard: {
      width: '100%',
      alignSelf: 'center',
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: palette.softAccentBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    item: {
      flex: 1,
      fontSize: 13,
      lineHeight: 23,
      color: palette.textDark,
      fontWeight: '600',
    },
  });
}
