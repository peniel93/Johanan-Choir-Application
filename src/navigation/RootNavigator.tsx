import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { DEFAULT_APP_BRANDING_SETTINGS, getAppBrandingSettings } from '../services/settingsService';
import { AboutScreen } from '../screens/AboutScreen';
import { AdminGatewayScreen } from '../screens/AdminGatewayScreen';
import { ContactScreen } from '../screens/ContactScreen';
import { DeveloperScreen } from '../screens/DeveloperScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LyricsScreen } from '../screens/LyricsScreen';
import { PhotoFavoritesScreen } from '../screens/PhotoFavoritesScreen';
import { PhotoSavedScreen } from '../screens/PhotoSavedScreen';
import { ShareAppScreen } from '../screens/ShareAppScreen';
import { ServicesScreen } from '../screens/ServicesScreen';


type DrawerRoutes = {
  Home: undefined;
  About: undefined;
  Services: undefined;
  Lyrics: undefined;
  Favorites: undefined;
  PhotoFavorites: undefined;
  PhotoSaved: undefined;
  Developer: undefined;
  Contact: undefined;
  Share: undefined;
  Admin: undefined;
};

const Drawer = createDrawerNavigator<DrawerRoutes>();

const DEFAULT_BRAND_LOGO = require('../../assets/Johanan-Choir-Application.jpg');

function BrandHeaderBadge({ onPress, compact = false }: { onPress?: () => void; compact?: boolean }) {
  const { palette } = useAppTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const [branding, setBranding] = useState(DEFAULT_APP_BRANDING_SETTINGS);
  const [logoFailed, setLogoFailed] = useState(false);

  const loadBranding = useCallback(() => {
    let mounted = true;

    getAppBrandingSettings()
      .then((settings) => {
        if (mounted) {
          setBranding(settings);
          setLogoFailed(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setBranding(DEFAULT_APP_BRANDING_SETTINGS);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return loadBranding();
  }, [loadBranding]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBranding();
    }, 4000);

    return () => clearInterval(timer);
  }, [loadBranding]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const logoSource = !logoFailed && branding.choirLogoUrl.trim().length > 0
    ? { uri: branding.choirLogoUrl }
    : DEFAULT_BRAND_LOGO;

  if (!onPress) {
    return (
      <View style={[styles.brandBadge, compact && styles.brandBadgeCompact]}>
        <Image source={logoSource} style={[styles.brandLogo, compact && styles.brandLogoCompact]} onError={() => setLogoFailed(true)} />
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.brandBadge, compact && styles.brandBadgeCompact]} accessibilityRole="button" accessibilityLabel="Go to Home">
      <Image source={logoSource} style={[styles.brandLogo, compact && styles.brandLogoCompact]} onError={() => setLogoFailed(true)} />
      {compact ? null : (
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.brandText,
            { color: palette.inverseText, transform: [{ scale }], opacity },
          ]}
        >
          {branding.choirTitle || 'Johanan Choir'}
        </Animated.Text>
      )}
    </Pressable>
  );
}

function AnimatedDrawerContent(props: DrawerContentComponentProps) {
  const { palette } = useAppTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const leftGlowOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  const rightGlowOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.82],
  });

  const leftShimmerY = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-36, 36],
  });

  const rightShimmerY = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [36, -36],
  });

  const topShimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 28],
  });

  const bottomShimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [28, -28],
  });

  return (
    <View style={[styles.drawerShell, { backgroundColor: palette.cardBackground }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        style={styles.drawerScroll}
      >
        <View style={[styles.drawerBrandPanel, { backgroundColor: palette.headerBackground, borderColor: palette.cardBorder }]}>
          <View style={styles.drawerBrandRow}>
            <BrandHeaderBadge onPress={() => props.navigation.navigate('Home')} />
          </View>
          <Text style={[styles.drawerBrandCaption, { color: palette.textMuted }]}>Navigate, switch appearance, and return home from one clean panel.</Text>
        </View>

        <View style={[styles.drawerControlPanel, { borderColor: palette.cardBorder, backgroundColor: palette.pageBackground }]}>
          <Text style={[styles.drawerSectionLabel, { color: palette.textMuted }]}>Quick controls</Text>
          <View style={styles.drawerControlRow}>
            <View style={styles.drawerControlTextWrap}>
              <Text style={[styles.drawerControlTitle, { color: palette.textDark }]}>Appearance</Text>
              <Text style={[styles.drawerControlSubtitle, { color: palette.textMuted }]}>Switch between light and dark mode.</Text>
            </View>
            <ThemeToggleButton />
          </View>
          <View style={styles.drawerControlDivider} />
          <View style={styles.drawerControlRow}>
            <View style={styles.drawerControlTextWrap}>
              <Text style={[styles.drawerControlTitle, { color: palette.textDark }]}>Language</Text>
              <Text style={[styles.drawerControlSubtitle, { color: palette.textMuted }]}>Toggle between English and Amharic.</Text>
            </View>
            <LanguageToggleButton />
          </View>
        </View>

        <View style={styles.drawerNavHeader}>
          <Text style={[styles.drawerSectionLabel, { color: palette.textMuted }]}>Navigation</Text>
          <Text style={[styles.drawerNavHeaderHint, { color: palette.textMuted }]}>Tap any item to move through the app.</Text>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View pointerEvents="none" style={styles.edgeOverlay}>
        <Animated.View
          style={[
            styles.verticalEdgeGlow,
            styles.leftEdgeGlow,
            {
              opacity: leftGlowOpacity,
              transform: [{ translateY: leftShimmerY }],
              backgroundColor: 'rgba(96, 165, 250, 0.55)',
            },
          ]}
        />
        <Animated.View
          style={[
            styles.verticalEdgeGlow,
            styles.rightEdgeGlow,
            {
              opacity: rightGlowOpacity,
              transform: [{ translateY: rightShimmerY }],
              backgroundColor: 'rgba(59, 130, 246, 0.45)',
            },
          ]}
        />
        <Animated.View
          style={[
            styles.horizontalEdgeGlow,
            styles.topEdgeGlow,
            {
              opacity: rightGlowOpacity,
              transform: [{ translateX: topShimmerX }],
              backgroundColor: 'rgba(59, 130, 246, 0.45)',
            },
          ]}
        />
        <Animated.View
          style={[
            styles.horizontalEdgeGlow,
            styles.bottomEdgeGlow,
            {
              opacity: leftGlowOpacity,
              transform: [{ translateX: bottomShimmerX }],
              backgroundColor: 'rgba(96, 165, 250, 0.55)',
            },
          ]}
        />

        <View style={[styles.verticalEdgeLine, styles.leftEdgeLine, { backgroundColor: '#1D4ED8' }]} />
        <View style={[styles.verticalEdgeLine, styles.rightEdgeLine, { backgroundColor: '#60A5FA' }]} />
        <View style={[styles.horizontalEdgeLine, styles.topEdgeLine, { backgroundColor: '#60A5FA' }]} />
        <View style={[styles.horizontalEdgeLine, styles.bottomEdgeLine, { backgroundColor: '#1D4ED8' }]} />
      </View>
    </View>
  );
}

function ThemeToggleButton() {
  const { isDark, toggleMode, palette } = useAppTheme();

  return (
    <Pressable
      onPress={toggleMode}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.softAccentBackground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={palette.softAccentText} />
    </Pressable>
  );
}

function LanguageToggleButton() {
  const { language, toggleLanguage } = useAppLanguage();
  const { palette } = useAppTheme();
  const label = language === 'am' ? 'EN' : 'አማ';

  return (
    <Pressable
      onPress={toggleLanguage}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.softAccentBackground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={language === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
    >
      <Text style={{ color: palette.softAccentText, fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function HeaderQuickLinks({
  activeRoute,
  onNavigate,
}: {
  activeRoute: keyof DrawerRoutes;
  onNavigate: (route: keyof DrawerRoutes) => void;
}) {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const topLinks: Array<{ key: keyof DrawerRoutes; label: string }> =
    language === 'en'
      ? [
          { key: 'Home', label: 'Home' },
          { key: 'About', label: 'About' },
          { key: 'Lyrics', label: 'መዝሙር' },
          { key: 'Services', label: 'Services' },
          { key: 'Contact', label: 'Contact' },
        ]
      : [
          { key: 'Home', label: 'ዋና ገጽ' },
          { key: 'About', label: 'ስለ እኛ' },
          { key: 'Lyrics', label: 'መዝሙር' },
          { key: 'Services', label: 'አገልግሎቶች' },
          { key: 'Contact', label: 'አግኙን' },
        ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 8,
      }}
    >
      {topLinks.map((link) => {
        const isActive = link.key === activeRoute;

        return (
          <Pressable
            key={link.key}
            onPress={() => onNavigate(link.key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? palette.white : '#93C5FD',
              backgroundColor: isActive ? '#1D4ED8' : 'transparent',
            }}
            accessibilityRole="button"
            accessibilityLabel={`Go to ${link.label}`}
          >
            <Text
              style={{
                color: palette.white,
                fontSize: 12,
                fontWeight: isActive ? '800' : '700',
              }}
            >
              {link.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function RootNavigator() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { palette, isDark } = useAppTheme();
  const { language } = useAppLanguage();

  const labels =
    language === 'en'
      ? {
          home: 'Home',
          about: 'About',
          services: 'Services',
          lyrics: 'የመዝሙር ግጥሞች',
          favorites: 'Favorite/Saved (Lyrics)',
          photoFavorites: 'Photo Favorites',
          photoSaved: 'Photo Saved',
          developer: 'Developer',
          contact: 'Contact',
          share: 'Share App',
          admin: 'Admin Panel',
        }
      : {
          home: 'ዋና ገጽ',
          about: 'ስለ እኛ',
          services: 'አገልግሎቶች',
          lyrics: 'የመዝሙር ግጥሞች',
          favorites: 'የተወደዱ/የተቀመጡ (መዝሙሮች)',
          photoFavorites: 'የፎቶ ተወዳጆች',
          photoSaved: 'የተቀመጡ ፎቶዎች',
          developer: 'ስለ ዴቨሎፐር',
          contact: 'አግኙን',
          share: 'መተግበሪያ አጋራ',
          admin: 'አድሚን ፓነል',
        };

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.pageBackground,
      card: palette.headerBackground,
      primary: palette.blue700,
      text: palette.inverseText,
      border: palette.cardBorder,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="Home"
        drawerContent={(props) => <AnimatedDrawerContent {...props} />}
        screenOptions={({ navigation, route }) => ({
          drawerType: isLargeScreen ? 'permanent' : 'front',
          drawerStyle: {
            width: isLargeScreen ? 300 : 282,
            backgroundColor: palette.cardBackground,
          },
          sceneStyle: {
            backgroundColor: palette.pageBackground,
          },
          headerStyle: { backgroundColor: palette.headerBackground },
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => navigation.toggleDrawer()}
                style={{ marginLeft: 10, marginRight: 6, padding: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Ionicons name="menu" size={24} color={palette.inverseText} />
              </Pressable>
              <BrandHeaderBadge onPress={isLargeScreen ? () => navigation.navigate('Home') : undefined} compact={!isLargeScreen} />
            </View>
          ),
          headerTintColor: palette.inverseText,
          headerTitle: () =>
            isLargeScreen ? (
              <HeaderQuickLinks
                activeRoute={route.name as keyof DrawerRoutes}
                onNavigate={(target) => navigation.navigate(target)}
              />
            ) : null,
          headerRight: () => null,
          drawerActiveBackgroundColor: palette.softAccentBackground,
          drawerActiveTintColor: palette.blue700,
          drawerInactiveTintColor: palette.textMuted,
          drawerItemStyle: {
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingVertical: 2,
          },
          drawerLabelStyle: {
            fontSize: 14,
            fontWeight: '700',
          },
          drawerIconStyle: {
            marginRight: -10,
          },
        })}
      >
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: labels.home,
            drawerIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="About"
          component={AboutScreen}
          options={{
            title: labels.about,
            drawerIcon: ({ color, size }) => <Ionicons name="information-circle" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Services"
          component={ServicesScreen}
          options={{
            title: labels.services,
            drawerIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Lyrics"
          component={LyricsScreen}
          options={{
            title: labels.lyrics,
            drawerIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{
            title: labels.favorites,
            drawerIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="PhotoFavorites"
          component={PhotoFavoritesScreen}
          options={{
            title: labels.photoFavorites,
            drawerIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="PhotoSaved"
          component={PhotoSavedScreen}
          options={{
            title: labels.photoSaved,
            drawerIcon: ({ color, size }) => <Ionicons name="images" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Developer"
          component={DeveloperScreen}
          options={{
            title: labels.developer,
            drawerIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Contact"
          component={ContactScreen}
          options={{
            title: labels.contact,
            drawerIcon: ({ color, size }) => <Ionicons name="mail" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Share"
          component={ShareAppScreen}
          options={{
            title: labels.share,
            drawerIcon: ({ color, size }) => <Ionicons name="share-social" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="Admin"
          component={AdminGatewayScreen}
          options={{
            title: labels.admin,
            drawerIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  brandBadge: {
    marginLeft: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 170,
  },
  brandBadgeCompact: {
    maxWidth: 52,
    marginRight: 0,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginRight: 8,
    backgroundColor: '#DBEAFE',
  },
  brandLogoCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 0,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  drawerBrandPanel: {
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  drawerBrandCaption: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  drawerControlPanel: {
    marginHorizontal: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  drawerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  drawerControlTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  drawerControlDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
    marginVertical: 12,
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  drawerControlTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  drawerControlSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  drawerShell: {
    flex: 1,
    overflow: 'hidden',
  },
  edgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  drawerScroll: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  drawerContent: {
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: 20,
  },
  drawerNavHeader: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 2,
  },
  drawerNavHeaderHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 8,
  },
  verticalEdgeGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    borderRadius: 999,
    zIndex: 25,
  },
  horizontalEdgeGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 18,
    borderRadius: 999,
    zIndex: 25,
  },
  leftEdgeGlow: {
    left: -1,
  },
  rightEdgeGlow: {
    right: -1,
  },
  topEdgeGlow: {
    top: -1,
  },
  bottomEdgeGlow: {
    bottom: -1,
  },
  verticalEdgeLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 26,
  },
  horizontalEdgeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    zIndex: 26,
  },
  leftEdgeLine: {
    left: 0,
  },
  rightEdgeLine: {
    right: 0,
  },
  topEdgeLine: {
    top: 0,
  },
  bottomEdgeLine: {
    bottom: 0,
  },
});
