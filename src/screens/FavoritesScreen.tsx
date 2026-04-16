import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CopyrightFooter } from '../components/CopyrightFooter';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { PageBackground } from '../components/PageBackground';
import { useAppLanguage } from '../context/LanguageContext';

import {
  fetchLyrics,
  fetchLyricsFromCache,
  getFavorites,
  getLikedSet,
  prefetchLyricAudioCache,
  resolveLyricAudioUri,
  toggleFavorite,
  toggleLike,
} from '../services/lyricsService';
import {
  LyricExportFormat,
  downloadLyricExport,
  printLyricPdf,
} from '../services/lyricExportService';
import { DEFAULT_LYRICS_TEXT_STYLE, getLyricsTextStyleSettings } from '../services/settingsService';
import { useAppTheme } from '../context/ThemeContext';
import { AppPalette } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { Lyric, TextStyleSettings } from '../types';

type SavedSection = 'bookmarked' | 'liked';

export function FavoritesScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const horizontalPadding = width < 420 ? 8 : width < 900 ? 12 : 18;
  const contentMaxWidth = width < 900 ? 780 : 980;

  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());
  const [section, setSection] = useState<SavedSection>('bookmarked');
  const [selectedLyric, setSelectedLyric] = useState<Lyric | null>(null);
  const [exportingFormat, setExportingFormat] = useState<LyricExportFormat | 'print' | 'share' | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [playingLyricId, setPlayingLyricId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [lyricsTextStyle, setLyricsTextStyle] = useState<TextStyleSettings>(DEFAULT_LYRICS_TEXT_STYLE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList<Lyric> | null>(null);

  const load = useCallback(async (forceRefresh?: boolean) => {
    try {
      if (!forceRefresh) {
        const cached = await fetchLyricsFromCache();
        if (cached.length > 0) {
          setLyrics(cached);
          setLoading(false);
        }
      }

      const data = await fetchLyrics();
      setLyrics(data);
      setFavoriteSet(await getFavorites());
      setLikedSet(await getLikedSet());
      prefetchLyricAudioCache(data).catch(() => {
        // Keep playback best-effort when offline caching fails.
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    getLyricsTextStyleSettings().then(setLyricsTextStyle).catch(() => {
      // Keep defaults when settings are unavailable.
    });
  }, [load]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    }).catch(() => {
      // Keep playback best-effort when audio mode cannot be configured.
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(setFavoriteSet);
      getLikedSet().then(setLikedSet);
      getLyricsTextStyleSettings().then(setLyricsTextStyle).catch(() => {
        // Keep defaults when settings are unavailable.
      });
    }, []),
  );

  useEffect(() => {
    return () => {
      if (audioSound) {
        audioSound.unloadAsync().catch(() => {
          // Ignore cleanup failure.
        });
      }
    };
  }, [audioSound]);

  const favoriteLyrics = useMemo(
    () => lyrics.filter((item) => favoriteSet.has(item.id)),
    [favoriteSet, lyrics],
  );

  const likedLyrics = useMemo(() => lyrics.filter((item) => likedSet.has(item.id)), [likedSet, lyrics]);

  const visibleLyrics = useMemo(() => {
    const list = section === 'bookmarked' ? favoriteLyrics : likedLyrics;
    return [...list].sort((a, b) => {
      const numA = a.number ?? Number.MAX_SAFE_INTEGER;
      const numB = b.number ?? Number.MAX_SAFE_INTEGER;
      if (numA !== numB) {
        return numA - numB;
      }

      return a.title.localeCompare(b.title, 'am-ET');
    });
  }, [section, favoriteLyrics, likedLyrics]);

  async function onLike(lyric: Lyric) {
    const next = await toggleLike(lyric.id);
    setLikedSet(new Set(next));

    setLyrics((prev) =>
      prev.map((item) => {
        if (item.id !== lyric.id) {
          return item;
        }

        const delta = next.has(item.id) ? 1 : -1;
        return { ...item, likes_count: Math.max(0, (item.likes_count ?? 0) + delta) };
      }),
    );
  }

  async function onFavorite(lyricId: string) {
    const next = await toggleFavorite(lyricId);
    setFavoriteSet(new Set(next));
  }

  function openLyric(lyric: Lyric) {
    setSelectedLyric(lyric);
  }

  async function onDownloadLyric(format: LyricExportFormat) {
    if (!selectedLyric || exportingFormat) {
      return;
    }

    setExportingFormat(format);
    try {
      const uri = await downloadLyricExport(selectedLyric, format);
      Alert.alert(
        isEnglish ? 'Exported' : 'ተሳክቷል',
        isEnglish ? `File exported successfully:\n${uri}` : `ፋይሉ በትክክል ተፈጥሯል:\n${uri}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Export failed.' : 'ኤክስፖርት አልተሳካም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
    } finally {
      setExportingFormat(null);
    }
  }

  async function onPrintPdf() {
    if (!selectedLyric || exportingFormat) {
      return;
    }

    setExportingFormat('print');
    try {
      await printLyricPdf(selectedLyric);
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Print failed.' : 'ማተም አልተሳካም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
      return;
    } finally {
      setExportingFormat(null);
    }

    Alert.alert(isEnglish ? 'Printed' : 'ታትሟል', isEnglish ? 'PDF print dialog opened.' : 'የPDF ማተሚያ ማውጫ ተከፍቷል።');
  }

  async function onShareToSocialMedia() {
    if (!selectedLyric || exportingFormat) {
      return;
    }

    setExportingFormat('share');
    try {
      const shareMessage = `${selectedLyric.title}\n\n${selectedLyric.content}`;

      await Share.share({
        title: selectedLyric.title,
        message: shareMessage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Share failed.' : 'ማጋራት አልተሳካም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
    } finally {
      setExportingFormat(null);
    }
  }

  async function onToggleLyricAudio() {
    if (!selectedLyric) {
      return;
    }

    if (audioBusy) {
      Alert.alert(
        isEnglish ? 'Preparing Audio' : 'ድምጽ በማዘጋጀት ላይ',
        isEnglish ? 'Please wait a moment and tap again.' : 'እባክዎ ጥቂት ይጠብቁ እና ዳግም ይንኩ።',
      );
      return;
    }

    if (!selectedLyric.audio_url) {
      Alert.alert(
        isEnglish ? 'No Audio' : 'ድምጽ የለም',
        isEnglish ? 'This lyric does not have an audio attachment yet.' : 'ይህ መዝሙር እስካሁን የተያያዘ ድምጽ የለውም።',
      );
      return;
    }

    setAudioBusy(true);
    try {
      if (playingLyricId === selectedLyric.id && audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
        setPlayingLyricId(null);
        return;
      }

      if (audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
      }

      const playableAudioUri = await resolveLyricAudioUri(selectedLyric.id, selectedLyric.audio_url);

      const uriCandidates = Array.from(
        new Set(
          [
            playableAudioUri,
            selectedLyric.audio_url,
            encodeURI(selectedLyric.audio_url),
          ]
            .map((item) => item?.trim())
            .filter((item): item is string => Boolean(item)),
        ),
      );

      let sound: Audio.Sound | null = null;
      let lastError: unknown = null;

      for (const candidateUri of uriCandidates) {
        try {
          const created = await Audio.Sound.createAsync(
            { uri: candidateUri },
            { shouldPlay: false },
          );
          await created.sound.playAsync();
          sound = created.sound;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!sound) {
        throw lastError instanceof Error ? lastError : new Error('Unable to play the selected audio source.');
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          return;
        }

        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {
            // Ignore unload failures after finish.
          });
          setAudioSound(null);
          setPlayingLyricId(null);
        }
      });

      setAudioSound(sound);
      setPlayingLyricId(selectedLyric.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Audio playback failed.' : 'ድምጽ ማጫወት አልተቻለም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
    } finally {
      setAudioBusy(false);
    }
  }

  if (loading) {
    return (
      <PageBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.blue700} />
          <Text style={styles.loadingText}>{isEnglish ? 'Loading saved lyrics...' : 'የተቀመጡ መዝሙሮች በመጫን ላይ...'}</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
      <View style={styles.sectionTabs}>
        <Pressable
          onPress={() => setSection('bookmarked')}
          style={[styles.tabButton, section === 'bookmarked' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, section === 'bookmarked' && styles.tabTextActive]}>
            {isEnglish ? 'Saved (Lyrics)' : 'የተቀመጡ (መዝሙሮች)'} ({favoriteLyrics.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSection('liked')}
          style={[styles.tabButton, section === 'liked' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, section === 'liked' && styles.tabTextActive]}>
            {isEnglish ? 'Liked (Lyrics)' : 'የተወደዱ (መዝሙሮች)'} ({likedLyrics.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={visibleLyrics}
        keyExtractor={(item) => item.id}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <Pressable style={styles.titleBtn} onPress={() => openLyric(item)}>
              <Text style={styles.rowNumber}>#{item.number ?? '-'}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.rowTitle, buildFormattedTextStyle(lyricsTextStyle)]}>{item.title}</Text>
            </Pressable>

            <View style={styles.rowActions}>
              <Pressable onPress={() => onLike(item)} style={styles.actionIconButton}>
                <Ionicons
                  name={likedSet.has(item.id) ? 'heart' : 'heart-outline'}
                  size={18}
                  color={likedSet.has(item.id) ? '#DC2626' : palette.blue700}
                />
              </Pressable>
              <Pressable onPress={() => onFavorite(item.id)} style={styles.actionIconButton}>
                <Ionicons
                  name={favoriteSet.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={palette.blue700}
                />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {section === 'bookmarked'
              ? isEnglish
                ? 'No saved lyrics yet.'
                : 'ምንም የተቀመጠ መዝሙር የለም።'
              : isEnglish
                ? 'No liked lyrics yet.'
                : 'ምንም የተወደደ መዝሙር የለም።'}
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
      <ScrollToTopButton visible={showScrollTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />

      <Modal visible={Boolean(selectedLyric)} animationType="slide" onRequestClose={() => setSelectedLyric(null)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEnglish ? 'Song Details' : 'መዝሙር ዝርዝር'}</Text>
            <Pressable style={styles.modalClose} onPress={() => setSelectedLyric(null)}>
              <Text style={styles.modalCloseText}>{isEnglish ? 'Close' : 'ዝጋ'}</Text>
            </Pressable>
          </View>

          {selectedLyric ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.detailNumber}>#{selectedLyric.number ?? '-'}</Text>
              <Text style={[styles.detailTitle, buildFormattedTextStyle(lyricsTextStyle)]}>{selectedLyric.title}</Text>
              <Text style={styles.detailMeta}>
                {selectedLyric.scale} • {selectedLyric.rhythm} • {isEnglish ? 'Transpose' : 'ትራንስፖዝ'}{' '}
                {`${(selectedLyric.transpose ?? 0) > 0 ? '+' : ''}${selectedLyric.transpose ?? 0}`}
              </Text>

              <View style={styles.audioRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.audioButton,
                    !selectedLyric.audio_url && styles.audioButtonDisabled,
                    pressed && styles.audioButtonPressed,
                  ]}
                  onPress={() => {
                    void onToggleLyricAudio();
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name={playingLyricId === selectedLyric.id ? 'pause' : 'play'}
                    size={16}
                    color={palette.white}
                  />
                  <Text style={styles.audioButtonText}>
                    {audioBusy
                      ? '...'
                      : playingLyricId === selectedLyric.id
                        ? isEnglish
                          ? 'Stop Audio'
                          : 'ድምጽ አቁም'
                        : isEnglish
                          ? 'Play Audio'
                          : 'ድምጽ አጫውት'}
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.detailContent, buildFormattedTextStyle(lyricsTextStyle)]}>{selectedLyric.content}</Text>

              <View style={styles.exportRow}>
                <Pressable
                  style={[styles.exportButton, exportingFormat === 'pdf' && styles.exportButtonDisabled]}
                  onPress={() => onDownloadLyric('pdf')}
                  disabled={exportingFormat !== null}
                >
                  <Text style={styles.exportButtonText}>{exportingFormat === 'pdf' ? '...' : 'PDF'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.exportButton, exportingFormat === 'share' && styles.exportButtonDisabled]}
                  onPress={onShareToSocialMedia}
                  disabled={exportingFormat !== null}
                >
                  <Text style={styles.exportButtonText}>
                    {exportingFormat === 'share' ? '...' : isEnglish ? 'Share with Social Media' : 'በማህበራዊ ሚዲያ አጋራ'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      <View style={styles.footerDock}>
        <CopyrightFooter />
      </View>
      </View>
    </View>
    </PageBackground>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.sky100,
    paddingTop: 10,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.sky100,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 12,
    color: palette.blue900,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 80,
  },
  rowCard: {
    backgroundColor: palette.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowNumber: {
    minWidth: 36,
    color: palette.softAccentText,
    fontWeight: '700',
  },
  rowTitle: {
    flex: 1,
    color: palette.blue900,
    fontWeight: '700',
    fontSize: 14,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.softAccentBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.chipBorder,
    backgroundColor: palette.chipBackground,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: palette.chipActiveBackground,
    borderColor: palette.chipActiveBackground,
  },
  tabText: {
    color: palette.blue900,
    fontWeight: '700',
    fontSize: 12,
  },
  tabTextActive: {
    color: palette.chipActiveText,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: palette.pageBackground,
  },
  modalHeader: {
    paddingTop: 50,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: palette.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: palette.white,
    fontWeight: '800',
    fontSize: 18,
  },
  modalClose: {
    backgroundColor: palette.blue700,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: palette.white,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailNumber: {
    color: palette.softAccentText,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailTitle: {
    color: palette.blue900,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailMeta: {
    fontSize: 12,
    color: palette.textMuted,
    marginBottom: 12,
    fontWeight: '600',
  },
  audioRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.blue700,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  audioButtonDisabled: {
    backgroundColor: palette.textMuted,
  },
  audioButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  audioButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  detailContent: {
    color: palette.textDark,
    lineHeight: 24,
    fontSize: 12,
    width: '88%',
    alignSelf: 'center',
  },
  exportRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  exportButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: palette.chipActiveBackground,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: palette.chipActiveText,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 30,
  },
  footerDock: {
    marginTop: 6,
    marginBottom: 6,
  },
  });
}
