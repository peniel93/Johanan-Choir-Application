import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { AppPalette } from '../theme/colors';

type AdminEntryMode = 'login' | 'register' | 'setup_super_admin';

export function AdminLoginScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const cardMaxWidth = width < 900 ? 760 : 860;
  const topOffset = width < 420 ? 72 : 120;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const { signIn, signUpAdmin, setupFirstSuperAdmin } = useAuth();
  const ownerEmail = process.env.EXPO_PUBLIC_OWNER_EMAIL?.trim().toLowerCase() ?? '';

  const [mode, setMode] = useState<AdminEntryMode>('login');
  const [fullName, setFullName] = useState('Peniel Abebe');
  const [email, setEmail] = useState(ownerEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const ownerEmailForSetup = ownerEmail || normalizedEmail;

    setInfo(null);
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        await signUpAdmin(normalizedEmail, password, fullName.trim());
        setInfo(
          isEnglish
            ? 'Registration complete. You can access dashboard after super admin approval.'
            : 'ተመዝግበዋል። ሱፐር አድሚን ፍቃድ ከሰጠ በኋላ ዳሽቦርድ ይገባሉ።',
        );
      } else if (mode === 'setup_super_admin') {
        await setupFirstSuperAdmin(normalizedEmail, password, fullName.trim(), ownerEmailForSetup);
        setInfo(isEnglish ? 'Super admin setup completed successfully.' : 'ሱፐር አድሚን በትክክል ተመዝግቧል።');
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (err) {
      const fallback = isEnglish ? 'The action failed.' : 'ሂደቱ አልተሳካም።';
      const message = err instanceof Error ? err.message : fallback;
      setError(`${fallback} ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ChoirBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      >
      <View style={[styles.card, { maxWidth: cardMaxWidth, marginTop: topOffset }]}> 
        <Text style={styles.title}>{isEnglish ? 'Admin Access' : 'አድሚን መዳረሻ'}</Text>

        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode('login')} style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Login' : 'ግባ'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('register')}
            style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
          >
            <Text style={styles.modeText}>{isEnglish ? 'Register' : 'ተመዝገብ'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('setup_super_admin');
              if (ownerEmail) {
                setEmail(ownerEmail);
              }
              if (!fullName.trim()) {
                setFullName('Peniel Abebe');
              }
            }}
            style={[styles.modeBtn, mode === 'setup_super_admin' && styles.modeBtnActive]}
          >
            <Text style={styles.modeText}>{isEnglish ? '1st Super Admin' : '1ኛ ሱፐር አድሚን'}</Text>
          </Pressable>
        </View>

        {mode === 'setup_super_admin' ? (
          <Text style={styles.setupHint}>
            {isEnglish
              ? 'To create the first super admin, your email must match EXPO_PUBLIC_OWNER_EMAIL.'
              : '1ኛ ሱፐር አድሚን ለመሆን ኢሜይልዎ ከ EXPO_PUBLIC_OWNER_EMAIL ጋር መመሳሰል አለበት።'}
          </Text>
        ) : null}

        {mode !== 'login' ? (
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={isEnglish ? 'Full name' : 'ሙሉ ስም'}
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
        ) : null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Password"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={palette.softAccentText} />
          </Pressable>
        </View>

        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={onSubmit} style={styles.button} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login'
                ? isEnglish
                  ? 'Login'
                  : 'ግባ'
                : mode === 'register'
                  ? isEnglish
                    ? 'Register'
                    : 'ተመዝገብ'
                  : isEnglish
                    ? 'Setup Super Admin'
                    : 'ሱፐር አድሚን አስጀምር'}
            </Text>
          )}
        </Pressable>

        <Text style={styles.helperText}>
          {isEnglish
            ? 'Super admin setup is one-time. After that, new admins register first and must be approved by a super admin.'
            : 'ሱፐር አድሚን አንድ ጊዜ ብቻ ይተከላል። ከዚያ በኋላ አዳዲስ አድሚኖች መጀመሪያ ተመዝግበው በሱፐር አድሚን ይፀድቃሉ።'}
        </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: palette.cardBackground,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    color: palette.blue900,
    fontWeight: '700',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  modeBtn: {
    backgroundColor: palette.blue700,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modeBtnActive: {
    backgroundColor: palette.headerBackground,
  },
  modeText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: palette.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: palette.cardBackground,
    color: palette.textDark,
    fontSize: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    backgroundColor: palette.softAccentBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  button: {
    marginTop: 8,
    backgroundColor: palette.blue700,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: palette.danger,
    marginBottom: 4,
  },
  info: {
    color: palette.success,
    marginBottom: 4,
  },
  helperText: {
    marginTop: 10,
    color: palette.textDark,
    lineHeight: 20,
    fontSize: 12,
  },
  setupHint: {
    marginBottom: 8,
    color: palette.softAccentText,
    lineHeight: 18,
    fontSize: 12,
  },
  });
}
