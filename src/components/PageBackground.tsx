import { PropsWithChildren } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

const APP_BACKGROUND_IMAGE = require('../../assets/Johanan-Choir-Application.jpg');

export function PageBackground({ children }: PropsWithChildren) {
  return (
    <ImageBackground
      source={APP_BACKGROUND_IMAGE}
      style={styles.background}
      imageStyle={styles.image}
    >
      <View style={styles.overlay}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  image: {
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 24, 49, 0.34)',
  },
});
