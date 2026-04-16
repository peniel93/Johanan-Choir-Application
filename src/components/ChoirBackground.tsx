import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, ImageBackground, ImageSourcePropType, StyleSheet, View, useWindowDimensions } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { CopyrightFooter } from './CopyrightFooter';
import { useAppTheme } from '../context/ThemeContext';

const FALLBACK_BACKGROUND = require('../../assets/Johanan-Choir-Application.jpg');

export function ChoirBackground({ children }: PropsWithChildren) {
  const fade = useRef(new Animated.Value(0.35)).current;
  const { width } = useWindowDimensions();
  const { isDark, palette } = useAppTheme();
  const horizontalPadding = width < 420 ? 12 : width < 900 ? 16 : 24;
  const topPadding = width < 420 ? 16 : 20;
  const maxContentWidth = width < 900 ? 760 : 920;

  const overlayColor = isDark ? '#020817' : '#0A2E6E';
  const gradientColors: readonly [string, string, string] = isDark
    ? ['#020817F0', '#0B1A30E0', '#111C2FCC']
    : ['#0A2E6EE0', '#2F6EE599', '#FFFFFFF2'];

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0.7,
          duration: 4500,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0.35,
          duration: 4500,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [fade]);
  const backgroundSource: ImageSourcePropType = FALLBACK_BACKGROUND;

  return (
    <View style={[styles.root, { backgroundColor: palette.pageBackground }]}>
      <ImageBackground
        source={backgroundSource}
        resizeMode="cover"
        style={styles.background}
      >
        <Animated.View style={[styles.overlay, { opacity: fade, backgroundColor: overlayColor }]} />
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradient, { paddingHorizontal: horizontalPadding, paddingTop: topPadding }]}
        >
          <View style={[styles.contentWrap, { maxWidth: maxContentWidth }]}>{children}</View>
          <View style={styles.footerDock}>
            <CopyrightFooter />
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A2E6E',
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A2E6E',
  },
  gradient: {
    flex: 1,
    paddingBottom: 46,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  footerDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
  },
});
