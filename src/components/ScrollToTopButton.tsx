import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SCROLL_TO_TOP_TRIGGER_OFFSET = 240;

type ScrollToTopButtonProps = {
  visible: boolean;
  onPress: () => void;
};

export function ScrollToTopButton({ visible, onPress }: ScrollToTopButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel="Scroll to top">
        <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 56,
    zIndex: 50,
    elevation: 8,
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});