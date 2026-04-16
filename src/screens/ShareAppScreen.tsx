import { useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { AppPalette } from '../theme/colors';

const DEFAULT_SHARE_URL = process.env.EXPO_PUBLIC_APP_SHARE_URL || 'https://example.com/johanan-choir-app';

export function ShareAppScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const shareMessage = useMemo(() => {
    return isEnglish
      ? `Check out the Johanan Choir lyrics app:\n${DEFAULT_SHARE_URL}`
      : `ዮሐናን መዘምራን የመዝሙር መተግበሪያን ይጠቀሙ:\n${DEFAULT_SHARE_URL}`;
  }, [isEnglish]);

  async function onShare() {
    try {
      await Share.share({
        message: shareMessage,
        url: DEFAULT_SHARE_URL,
        title: 'Johanan Choir App',
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : isEnglish ? 'Unable to share.' : 'ማጋራት አልተቻለም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', text);
    }
  }

  return (
    <ChoirBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isEnglish ? 'Share The App' : 'መተግበሪያውን አጋራ'}</Text>
          <Text style={styles.body}>
            {isEnglish
              ? 'Tap the button below to open the native sharing apps on your device.'
              : 'በታች ያለውን ቁልፍ በመጫን የሞባይል ማጋራት አፕሊኬሽኖችን እንዲከፍት ያድርጉ።'}
          </Text>

          <Pressable style={styles.primaryButton} onPress={onShare}>
            <Text style={styles.primaryText}>{isEnglish ? 'Share' : 'አጋራ'}</Text>
          </Pressable>

          {Platform.OS === 'web' ? (
            <Text style={styles.hint}>
              {isEnglish ? 'Native share sheet may be unavailable on web.' : 'Web ላይ የnative share sheet የማይገኝ ሊሆን ይችላል።'}
            </Text>
          ) : null}
        </View>
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
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 48,
  },
  card: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    backgroundColor: palette.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  title: {
    color: palette.blue900,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 22,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: palette.blue700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  hint: {
    marginTop: 10,
    color: palette.textMuted,
    fontSize: 12,
  },
  });
}
