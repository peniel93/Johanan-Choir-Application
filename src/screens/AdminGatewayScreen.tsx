import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PageBackground } from '../components/PageBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { AppPalette } from '../theme/colors';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { AdminLoginScreen } from './AdminLoginScreen';

export function AdminGatewayScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const cardMaxWidth = width < 900 ? 760 : 860;
  const horizontalPadding = width < 420 ? 16 : 24;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const { loading, user, profile, signOut, refreshProfile } = useAuth();

  if (loading) {
    return (
      <PageBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.blue700} />
        </View>
      </PageBackground>
    );
  }

  if (profile?.role === 'pending_admin') {
    return (
      <PageBackground>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.stateWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
          scrollEventThrottle={16}
        >
          <View style={[styles.stateCard, { maxWidth: cardMaxWidth }]}> 
            <Text style={styles.title}>{isEnglish ? 'Approval Pending' : 'ማረጋገጫ በመጠባበቅ ላይ'}</Text>
            <Text style={styles.body}>
              {isEnglish
                ? 'Your account is registered. You can access the dashboard after super admin approval.'
                : 'መለያዎ ተመዝግቧል። ሱፐር አድሚን ፍቃድ ከሰጠ በኋላ ወደ ዳሽቦርድ ይገባሉ።'}
            </Text>
            <Pressable onPress={signOut} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{isEnglish ? 'Sign Out' : 'ውጣ'}</Text>
            </Pressable>
          </View>
        </ScrollView>
        <ScrollToTopButton visible={showScrollTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
      </PageBackground>
    );
  }

  if (user && !profile) {
    return (
      <PageBackground>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.stateWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
          scrollEventThrottle={16}
        >
          <View style={[styles.stateCard, { maxWidth: cardMaxWidth }]}> 
            <Text style={styles.title}>{isEnglish ? 'Account Found' : 'መለያ ተገብሯል'}</Text>
            <Text style={styles.body}>
              {isEnglish
                ? 'But no admin profile record was found. Please retry or verify your database policies.'
                : 'ግን የአድሚን ፕሮፋይል መረጃ አልተገኘም። እባክዎ እንደገና ሞክሩ ወይም ከመረጃ ቋቱ ፖሊሲ ጋር ያረጋግጡ።'}
            </Text>
            <View style={styles.buttonRow}>
              <Pressable onPress={refreshProfile} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{isEnglish ? 'Retry' : 'እንደገና ሞክር'}</Text>
              </Pressable>
              <Pressable onPress={signOut} style={styles.secondaryButton}>
                <Text style={styles.primaryText}>{isEnglish ? 'Sign Out' : 'ውጣ'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
        <ScrollToTopButton visible={showScrollTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
      </PageBackground>
    );
  }

  if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return <AdminLoginScreen />;
  }

  return <AdminDashboardScreen />;
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    stateWrap: {
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: 'transparent',
      paddingTop: 16,
      paddingBottom: 80,
    },
    stateCard: {
      width: '100%',
      alignSelf: 'center',
      alignItems: 'center',
      backgroundColor: palette.cardBackground,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      borderRadius: 16,
      padding: 16,
    },
    title: {
      color: palette.blue900,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 12,
      textAlign: 'center',
    },
    body: {
      fontSize: 12,
      color: palette.textDark,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    primaryButton: {
      backgroundColor: palette.blue700,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryButton: {
      backgroundColor: palette.textMuted,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    primaryText: {
      color: palette.white,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
