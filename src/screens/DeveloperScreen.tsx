import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { DEFAULT_PAGE_TEXT_STYLE, getDeveloperInfo, getPageTextStyleSettings } from '../services/settingsService';
import { AppPalette } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { DeveloperProfile, TextStyleSettings } from '../types';

type IoniconName = keyof typeof Ionicons.glyphMap;

function resolveIoniconName(iconName: string | null | undefined): IoniconName {
  if (iconName && iconName in Ionicons.glyphMap) {
    return iconName as IoniconName;
  }

  return 'link-outline';
}

export function DeveloperScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadDeveloper = useCallback(() => {
    Promise.all([getDeveloperInfo(), getPageTextStyleSettings()])
      .then(([info, style]) => {
        setDeveloper(info);
        setPageTextStyle(style);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDeveloper();
  }, [loadDeveloper]);

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
      loadDeveloper();
    }, [loadDeveloper]),
  );

  async function callDeveloper() {
    const phone = developer?.phone?.trim();
    if (!phone) {
      return;
    }

    const phoneUri = `tel:${phone}`;
    const supported = await Linking.canOpenURL(phoneUri);
    if (!supported) {
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', isEnglish ? 'Phone dialer app was not found.' : 'የስልክ መደወያ መተግበሪያ አልተገኘም።');
      return;
    }

    await Linking.openURL(phoneUri);
  }

  async function emailDeveloper() {
    const email = developer?.email?.trim();
    if (!email) {
      return;
    }

    const emailUri = `mailto:${email}`;
    const supported = await Linking.canOpenURL(emailUri);
    if (!supported) {
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', isEnglish ? 'Email app was not found.' : 'የኢሜይል መተግበሪያ አልተገኘም።');
      return;
    }

    await Linking.openURL(emailUri);
  }

  async function openSocialLink(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', isEnglish ? 'Link cannot be opened.' : 'ሊንኩ ሊከፈት አልቻለም።');
      return;
    }

    await Linking.openURL(url);
  }

  const initials = useMemo(() => {
    if (!developer?.name) {
      return 'JD';
    }

    const words = developer.name.trim().split(/\s+/).filter(Boolean);
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'JD';
  }, [developer?.name]);

  const socialLinks = developer?.socialLinks ?? [];

  return (
    <ChoirBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={[
            styles.card,
            {
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
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Meet The Developer' : 'ዴቨሎፐሩን ይወቁ'}</Text>
              <Text style={[styles.subtitle, buildFormattedTextStyle(pageTextStyle)]}>
                {isEnglish ? 'Building reliable tools for your choir ministry.' : 'ለመዘምራን አገልግሎትዎ አስተማማኝ መሳሪያዎችን እየገነባ።'}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.blue700} />
            </View>
          ) : (
            <>
              <View style={styles.infoPanel}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={palette.blue700} />
                  <View style={styles.infoTextWrap}>
                    <Text style={[styles.label, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Name' : 'ስም'}</Text>
                    <Text style={[styles.value, buildFormattedTextStyle(pageTextStyle)]}>{developer?.name || '-'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={16} color={palette.blue700} />
                  <View style={styles.infoTextWrap}>
                    <Text style={[styles.label, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Email' : 'ኢሜይል'}</Text>
                    <Text style={[styles.value, buildFormattedTextStyle(pageTextStyle)]}>{developer?.email || '-'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color={palette.blue700} />
                  <View style={styles.infoTextWrap}>
                    <Text style={[styles.label, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Phone' : 'ስልክ'}</Text>
                    <Text style={[styles.value, buildFormattedTextStyle(pageTextStyle)]}>{developer?.phone || '-'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={callDeveloper}>
                  <Ionicons name="call" size={15} color={palette.chipActiveText} />
                  <Text style={[styles.actionButtonText, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Call' : 'ደውል'}</Text>
                </Pressable>
                <Pressable style={styles.actionButtonSecondary} onPress={emailDeveloper}>
                  <Ionicons name="mail" size={15} color={palette.blue700} />
                  <Text style={[styles.actionButtonSecondaryText, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Email' : 'ኢሜይል'}</Text>
                </Pressable>
              </View>

              <View style={styles.bioCard}>
                <Text style={[styles.bioTitle, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Short Bio' : 'አጭር መግለጫ'}</Text>
                <Text style={[styles.bio, buildFormattedTextStyle(pageTextStyle)]}>{developer?.bio || '-'}</Text>
              </View>

              {socialLinks.length > 0 ? (
                <View style={styles.socialLinksCard}>
                  <Text style={[styles.bioTitle, buildFormattedTextStyle(pageTextStyle)]}>{isEnglish ? 'Social Media' : 'ማህበራዊ መገናኛዎች'}</Text>
                  <View style={styles.socialLinksRow}>
                    {socialLinks.map((link) => (
                      <Pressable key={link.id} style={styles.socialLinkButton} onPress={() => openSocialLink(link.url)}>
                        <View style={styles.socialLinkIconCircle}>
                          <Ionicons name={resolveIoniconName(link.iconName)} size={17} color={palette.blue700} />
                        </View>
                        <Text style={styles.socialLinkButtonText} numberOfLines={1}>{link.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
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
    paddingTop: 24,
    paddingBottom: 26,
  },
  card: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: palette.cardBackground,
    borderColor: palette.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.chipActiveBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.chipActiveText,
    fontSize: 18,
    fontWeight: '800',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: palette.blue900,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 20,
    color: palette.textMuted,
    fontWeight: '600',
  },
  loadingRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  infoPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.pageBackground,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoTextWrap: {
    flex: 1,
  },
  label: {
    color: palette.softAccentText,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  value: {
    fontSize: 13,
    color: palette.textDark,
    lineHeight: 21,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: palette.chipActiveBackground,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionButtonText: {
    color: palette.chipActiveText,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.chipBorder,
    backgroundColor: palette.chipBackground,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionButtonSecondaryText: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: '700',
  },
  bioCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.cardBackground,
    padding: 12,
  },
  socialLinksCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.pageBackground,
    padding: 12,
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: palette.chipActiveBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  socialLinkIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.chipBackground,
  },
  socialLinkButtonText: {
    color: palette.chipActiveText,
    fontSize: 12,
    fontWeight: '700',
  },
  bioTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.blue900,
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: palette.textDark,
    lineHeight: 23,
  },
  });
}
