import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { getContactRecipientsInfo, submitContactMessage, SUPER_ADMIN_CONTACT_EMAIL } from '../services/contactService';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { AppPalette } from '../theme/colors';

function buildEmailRecipientsParam(recipients: string[]) {
  return recipients.join(',');
}

export function ContactScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [lyricSuggestion, setLyricSuggestion] = useState('');
  const [spellingError, setSpellingError] = useState('');
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([SUPER_ADMIN_CONTACT_EMAIL]);
  const [selectedRecipient, setSelectedRecipient] = useState<'ALL' | string>('ALL');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  function syncRecipients() {
    getContactRecipientsInfo()
      .then((info) => {
        const nextRecipients = info.recipients.length > 0 ? info.recipients : [SUPER_ADMIN_CONTACT_EMAIL];
        setRecipients(nextRecipients);
        setSelectedRecipient((current) => (current === 'ALL' || nextRecipients.includes(current) ? current : 'ALL'));
      })
      .catch(() => {
        const fallback = [SUPER_ADMIN_CONTACT_EMAIL];
        setRecipients(fallback);
        setSelectedRecipient('ALL');
      });
  }

  useEffect(() => {
    syncRecipients();
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncRecipients();
    }, []),
  );

  async function onSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert(
        isEnglish ? 'Warning' : 'ማስጠንቀቂያ',
        isEnglish ? 'Name, email, and message are required.' : 'ስም፣ ኢሜይል እና መልዕክት ያስፈልጋሉ።',
      );
      return;
    }

    setSending(true);
    try {
      const inserted = await submitContactMessage({
        name,
        email,
        message,
        lyricSuggestion,
        spellingError,
        targetEmail: selectedRecipient === 'ALL' ? null : selectedRecipient,
      });

      setName('');
      setEmail('');
      setMessage('');
      setLyricSuggestion('');
      setSpellingError('');
      Alert.alert(
        isEnglish ? 'Success' : 'ተሳክቷል',
        isEnglish
          ? `Your message has been saved and delivered to ${inserted?.recipients?.length ?? recipients.length} receiver(s). ID: ${inserted?.id ?? '-'}`
          : `መልዕክትዎ ተመዝግቧል እና ወደ ${inserted?.recipients?.length ?? recipients.length} ተቀባዮች ተልኳል። ID: ${inserted?.id ?? '-'}`,
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : isEnglish ? 'Failed to send message.' : 'መልዕክት መላክ አልተቻለም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', text);
    } finally {
      setSending(false);
    }
  }

  async function sendViaEmailApp() {
    const allTargets = recipients.length > 0 ? recipients : [SUPER_ADMIN_CONTACT_EMAIL];
    const targetList = selectedRecipient === 'ALL' ? allTargets : [selectedRecipient];
    const recipientsParam = buildEmailRecipientsParam(targetList);

    const subject = encodeURIComponent('Johanan Choir Contact Form');
    const body = encodeURIComponent(
      [
        `Name: ${name || '-'}`,
        `Email: ${email || '-'}`,
        '',
        'Main Message:',
        message || '-',
        '',
        'Lyrics Suggestion:',
        lyricSuggestion || '-',
        '',
        'Spelling Error Report:',
        spellingError || '-',
      ].join('\n'),
    );

    if (Platform.OS === 'web') {
      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientsParam)}&su=${subject}&body=${body}`;
      const outlookComposeUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipientsParam)}&subject=${subject}&body=${body}`;

      try {
        await Linking.openURL(gmailComposeUrl);
        return;
      } catch {
        // Try fallback provider below.
      }

      try {
        await Linking.openURL(outlookComposeUrl);
        return;
      } catch {
        Alert.alert(
          isEnglish ? 'Error' : 'ስህተት',
          isEnglish
            ? `Could not open an email provider. Please use ${targetList.join(', ')} manually.`
            : `የኢሜይል አገልግሎት መክፈት አልተቻለም። እባክዎ ${targetList.join(', ')} በእጅ ይጠቀሙ።`,
        );
        return;
      }
    }

    const mailto = `mailto:${recipientsParam}?subject=${subject}&body=${body}`;
    let supported = true;
    try {
      supported = await Linking.canOpenURL(mailto);
    } catch {
      supported = true;
    }

    if (!supported) {
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', isEnglish ? 'No email app was found.' : 'የኢሜይል መተግበሪያ አልተገኘም።');
      return;
    }

    try {
      await Linking.openURL(mailto);
    } catch {
      Alert.alert(
        isEnglish ? 'Error' : 'ስህተት',
        isEnglish
          ? `Could not open email app. Please use ${targetList.join(', ')} manually.`
          : `የኢሜይል መተግበሪያ መክፈት አልተቻለም። እባክዎ ${targetList.join(', ')} በእጅ ይጠቀሙ።`,
      );
    }
  }

  return (
    <ChoirBackground>
    <View style={styles.pageLayout}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.wrap}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      >
        <View style={styles.card}>
        <Text style={styles.title}>{isEnglish ? 'Contact Us' : 'አግኙን'}</Text>
        <Text style={styles.subtitle}>
          {isEnglish
            ? `Your message is stored and sent to super admin plus ${Math.max(recipients.length - 1, 0)} active receiver(s).`
            : `መልዕክትዎ ይመዘገባል እና ወደ ሱፐር አድሚን ከተጨማሪ ${Math.max(recipients.length - 1, 0)} ነቃ ተቀባዮች ጋር ይላካል።`}
        </Text>

        <Text style={styles.selectorLabel}>{isEnglish ? 'Send To' : 'ወደ ማን ይላክ'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientsRow}>
          <Pressable
            style={[styles.recipientChip, selectedRecipient === 'ALL' && styles.recipientChipActive]}
            onPress={() => setSelectedRecipient('ALL')}
          >
            <Text style={[styles.recipientChipText, selectedRecipient === 'ALL' && styles.recipientChipTextActive]}>
              {isEnglish ? 'All Active Receivers' : 'ሁሉም ነቃ ተቀባዮች'}
            </Text>
          </Pressable>
          {recipients.map((item) => (
            <Pressable
              key={item}
              style={[styles.recipientChip, selectedRecipient === item && styles.recipientChipActive]}
              onPress={() => setSelectedRecipient(item)}
            >
              <Text style={[styles.recipientChipText, selectedRecipient === item && styles.recipientChipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput value={name} onChangeText={setName} placeholder={isEnglish ? 'Name' : 'ስም'} placeholderTextColor={palette.textMuted} style={styles.input} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={isEnglish ? 'Email' : 'ኢሜይል'}
          placeholderTextColor={palette.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={isEnglish ? 'Main message' : 'ዋና መልዕክት'}
          placeholderTextColor={palette.textMuted}
          multiline
          style={[styles.input, styles.largeInput]}
        />
        <TextInput
          value={lyricSuggestion}
          onChangeText={setLyricSuggestion}
          placeholder={isEnglish ? 'Lyrics suggestion' : 'የመዝሙር ሀሳብ / ጥቆማ'}
          placeholderTextColor={palette.textMuted}
          multiline
          style={[styles.input, styles.mediumInput]}
        />
        <TextInput
          value={spellingError}
          onChangeText={setSpellingError}
          placeholder={isEnglish ? 'Spelling error report' : 'የፊደል ስህተት አስተያየት'}
          placeholderTextColor={palette.textMuted}
          multiline
          style={[styles.input, styles.mediumInput]}
        />

        <Pressable style={styles.submitButton} onPress={onSubmit} disabled={sending}>
          {sending ? <ActivityIndicator color={palette.white} /> : <Text style={styles.submitText}>{isEnglish ? 'Submit' : 'ላክ'}</Text>}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={sendViaEmailApp}>
          <Text style={styles.secondaryText}>{isEnglish ? 'Send via email app' : 'በኢሜይል መተግበሪያ ላክ'}</Text>
        </Pressable>
        </View>
      </ScrollView>
    </View>
    <ScrollToTopButton visible={showScrollTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
    </ChoirBackground>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
  pageLayout: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  wrap: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
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
  subtitle: {
    fontSize: 12,
    color: palette.textMuted,
    marginBottom: 10,
    lineHeight: 20,
  },
  selectorLabel: {
    fontSize: 12,
    color: palette.blue900,
    fontWeight: '700',
    marginBottom: 6,
  },
  recipientsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  recipientChip: {
    borderWidth: 1,
    borderColor: palette.chipBorder,
    backgroundColor: palette.chipBackground,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  recipientChipActive: {
    backgroundColor: palette.chipActiveBackground,
    borderColor: palette.chipActiveBackground,
  },
  recipientChipText: {
    color: palette.blue900,
    fontSize: 12,
    fontWeight: '600',
  },
  recipientChipTextActive: {
    color: palette.chipActiveText,
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
  mediumInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  largeInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: palette.blue700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.chipBorder,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: palette.softAccentBackground,
  },
  secondaryText: {
    color: palette.softAccentText,
    fontSize: 12,
    fontWeight: '700',
  },
  });
}
