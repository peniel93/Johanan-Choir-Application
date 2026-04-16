import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../context/ThemeContext';
import { useAppLanguage } from '../context/LanguageContext';
import { DEFAULT_APP_ACCESS_SETTINGS, getAppAccessSettings } from '../services/settingsService';
import { AppPalette } from '../theme/colors';

export function AppAccessGate({ children }: PropsWithChildren) {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [expectedPassword, setExpectedPassword] = useState(DEFAULT_APP_ACCESS_SETTINGS.appPassword);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPassword() {
    const settings = await getAppAccessSettings();
    setExpectedPassword(settings.appPassword || DEFAULT_APP_ACCESS_SETTINGS.appPassword);
  }

  useEffect(() => {
    loadPassword().finally(() => setLoading(false));
  }, []);

  function unlock() {
    setError(null);
    if (password === expectedPassword) {
      setUnlocked(true);
      setPassword('');
      return;
    }

    setError(isEnglish ? 'The password is incorrect.' : 'የይለፍ ቃል ትክክል አይደለም።');
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={palette.blue700} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>{isEnglish ? 'App Security' : 'የመተግበሪያ ደህንነት'}</Text>
          <Text style={styles.subtitle}>
            {isEnglish ? 'Enter the password to open the application.' : 'መተግበሪያውን ለመክፈት የይለፍ ቃል ያስገቡ።'}
          </Text>

          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder={isEnglish ? 'Password' : 'የይለፍ ቃል'}
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.passwordInput]}
              onSubmitEditing={unlock}
            />
            <Pressable style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={palette.softAccentText} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={unlock}>
            <Text style={styles.buttonText}>{isEnglish ? 'Unlock' : 'ክፈት'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.pageBackground,
  },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.pageBackground,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: 16,
  },
  title: {
    color: palette.blue900,
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 8,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: palette.cardBackground,
    color: palette.textDark,
    fontSize: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    backgroundColor: palette.softAccentBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: palette.danger,
    fontSize: 12,
    marginBottom: 6,
  },
  button: {
    backgroundColor: palette.blue700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  });
}
