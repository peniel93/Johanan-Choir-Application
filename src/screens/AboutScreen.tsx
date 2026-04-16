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

export function AboutScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const topOffset = width < 420 ? 24 : 42;
  const cardMaxWidth = width < 900 ? 760 : 900;
  const [content, setContent] = useState<PageContentSettings>(isEnglish ? DEFAULT_PAGE_CONTENT_EN : DEFAULT_PAGE_CONTENT);
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const aboutSections = useMemo(() => {
    const chunks = content.aboutBody
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    return chunks.length > 0 ? chunks : [content.aboutBody.trim()];
  }, [content.aboutBody]);

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
      duration: 700,
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
        <View style={[styles.decorCircle, styles.decorCircleLeft]} />
        <View style={[styles.decorCircle, styles.decorCircleRight]} />

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
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="book-outline" size={16} color={palette.blue700} />
            <Text style={styles.heroBadgeText}>{isEnglish ? 'Who We Are' : 'እኛ ማን ነን'}</Text>
          </View>
          <Text style={[styles.title, buildFormattedTextStyle(pageTextStyle)]}>{content.aboutTitle}</Text>
          <Text style={[styles.heroSubTitle, buildFormattedTextStyle(pageTextStyle)]}>
            {isEnglish ? 'A living choir story built around worship, unity, and service.' : 'በአምልኮ፣ በአንድነት እና በአገልግሎት የተገነባ የሕይወት ታሪክ ያለው መዘምራን።'}
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.contentCard,
            {
              maxWidth: cardMaxWidth,
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [45, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {aboutSections.map((section, index) => (
            <View key={`${section.slice(0, 24)}-${index}`} style={styles.sectionRow}>
              <View style={styles.sectionMarker} />
              <Text style={[styles.body, buildFormattedTextStyle(pageTextStyle)]}>{section}</Text>
            </View>
          ))}
        </Animated.View>
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
      paddingBottom: 26,
      gap: 12,
    },
    decorCircle: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.2,
      backgroundColor: palette.blue500,
    },
    decorCircleLeft: {
      width: 180,
      height: 180,
      top: 10,
      left: -70,
    },
    decorCircleRight: {
      width: 220,
      height: 220,
      top: 120,
      right: -110,
    },
    heroCard: {
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      width: '100%',
      alignSelf: 'center',
      shadowColor: '#0F172A',
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: palette.chipBorder,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
      backgroundColor: palette.chipBackground,
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
    heroSubTitle: {
      fontSize: 13,
      lineHeight: 22,
      color: palette.textMuted,
      fontWeight: '600',
    },
    contentCard: {
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      borderRadius: 22,
      padding: 16,
      width: '100%',
      alignSelf: 'center',
    },
    body: {
      fontSize: 13,
      lineHeight: 24,
      color: palette.textDark,
    },
    sectionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    sectionMarker: {
      width: 4,
      borderRadius: 999,
      backgroundColor: palette.blue500,
    },
  });
}
