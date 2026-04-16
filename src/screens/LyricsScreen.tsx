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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { RHYTHM_OPTIONS, SCALE_OPTIONS } from '../constants/categories';
import { CopyrightFooter } from '../components/CopyrightFooter';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { PageBackground } from '../components/PageBackground';
import { useFocusEffect } from '@react-navigation/native';
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
import { fetchMusicCategoryOptions } from '../services/musicCategoriesService';
import { DEFAULT_LYRICS_TEXT_STYLE, getLyricsTextStyleSettings } from '../services/settingsService';
import { useAppTheme } from '../context/ThemeContext';
import { AppPalette } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { CategoryOption, LyricsFilters, Lyric, TextStyleSettings } from '../types';

const initialFilters: LyricsFilters = {
  query: '',
  scale: 'ALL',
  rhythm: 'ALL',
  sortBy: 'NUMBER',
};

const LYRICS_SCROLL_TOP_TRIGGER_OFFSET = 96;

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'`“”‘’\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSearchTerms(value: string) {
  return normalizeSearchText(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isRelatedWordMatch(term: string, candidate: string) {
  if (!term || !candidate) {
    return false;
  }

  if (candidate.includes(term) || term.includes(candidate)) {
    return true;
  }

  // Loose stem-style matching for related word forms.
  if (term.length >= 4 && candidate.length >= 4) {
    return term.slice(0, 4) === candidate.slice(0, 4);
  }

  return false;
}

function isTermMatched(term: string, textTokens: string[], numberText: string) {
  if (numberText.includes(term)) {
    return true;
  }

  return textTokens.some((token) => isRelatedWordMatch(term, token));
}

export function LyricsScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const horizontalPadding = width < 420 ? 8 : width < 900 ? 12 : 18;
  const contentMaxWidth = width < 900 ? 780 : 980;

  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [filters, setFilters] = useState<LyricsFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());
  const [selectedLyric, setSelectedLyric] = useState<Lyric | null>(null);
  const [exportingFormat, setExportingFormat] = useState<LyricExportFormat | 'print' | 'share' | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [playingLyricId, setPlayingLyricId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [lyricsTextStyle, setLyricsTextStyle] = useState<TextStyleSettings>(DEFAULT_LYRICS_TEXT_STYLE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showDetailScrollTop, setShowDetailScrollTop] = useState(false);
  const listRef = useRef<FlatList<Lyric> | null>(null);
  const detailScrollRef = useRef<ScrollView | null>(null);
  const [scaleOptions, setScaleOptions] = useState<CategoryOption[]>(SCALE_OPTIONS);
  const [rhythmOptions, setRhythmOptions] = useState<CategoryOption[]>(RHYTHM_OPTIONS);
  const sortOptions = useMemo<Array<{ value: LyricsFilters['sortBy']; label: string }>>(
    () => [
      { value: 'NUMBER', label: isEnglish ? 'By Number' : 'በቁጥር' },
      { value: 'NEWEST', label: isEnglish ? 'Newest' : 'አዲስ' },
      { value: 'OLDEST', label: isEnglish ? 'Oldest' : 'አሮጌ' },
    ],
    [isEnglish],
  );

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
    fetchMusicCategoryOptions('scale', true).then(setScaleOptions).catch(() => {
      // Keep defaults when categories are unavailable.
    });
    fetchMusicCategoryOptions('rhythm', true).then(setRhythmOptions).catch(() => {
      // Keep defaults when categories are unavailable.
    });
    getLikedSet().then(setLikedSet);
    getFavorites().then(setFavoriteSet);
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
      load(true);
      fetchMusicCategoryOptions('scale', true).then(setScaleOptions).catch(() => {
        // Keep defaults when categories are unavailable.
      });
      fetchMusicCategoryOptions('rhythm', true).then(setRhythmOptions).catch(() => {
        // Keep defaults when categories are unavailable.
      });
      getLikedSet().then(setLikedSet);
      getFavorites().then(setFavoriteSet);
      getLyricsTextStyleSettings().then(setLyricsTextStyle).catch(() => {
        // Keep defaults when settings are unavailable.
      });
    }, [load]),
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

  useEffect(() => {
    setShowDetailScrollTop(false);
  }, [selectedLyric]);

  const visibleLyrics = useMemo(() => {
    const query = normalizeSearchText(filters.query);
    const queryTerms = splitSearchTerms(query);

    const rows = lyrics
      .filter((song) => {
        const matchesScale = filters.scale === 'ALL' || song.scale === filters.scale;
        const matchesRhythm = filters.rhythm === 'ALL' || song.rhythm === filters.rhythm;

        if (!matchesScale || !matchesRhythm) {
          return false;
        }

        if (queryTerms.length === 0) {
          return true;
        }

        const titleTokens = splitSearchTerms(song.title);
        const contentTokens = splitSearchTerms(song.content);
        const allTokens = [...titleTokens, ...contentTokens];
        const numberText = (song.number?.toString() ?? '').toLowerCase();

        // Inclusive search: every term in query must be found in title/content/number.
        return queryTerms.every((term) => isTermMatched(term, allTokens, numberText));
      })
      .map((song) => {
        const title = normalizeSearchText(song.title);
        const titleTokens = splitSearchTerms(song.title);
        const contentTokens = splitSearchTerms(song.content);
        const allTokens = [...titleTokens, ...contentTokens];
        const numberText = (song.number?.toString() ?? '').toLowerCase();

        const titleMatchesAllTerms =
          queryTerms.length > 0 && queryTerms.every((term) => isTermMatched(term, titleTokens, numberText));
        const contentMatchesAllTerms =
          queryTerms.length > 0 && queryTerms.every((term) => isTermMatched(term, contentTokens, numberText));
        const anyTermInTitle = queryTerms.some((term) => isTermMatched(term, titleTokens, numberText));
        const allTermsMatched = queryTerms.length > 0 && queryTerms.every((term) => isTermMatched(term, allTokens, numberText));

        const rank =
          queryTerms.length === 0
            ? 99
            : numberText === query
              ? 0
              : title.startsWith(query)
                ? 1
                : title.includes(query) || titleMatchesAllTerms
                  ? 2
                  : contentMatchesAllTerms || allTermsMatched
                    ? 3
                    : anyTermInTitle
                      ? 4
                      : 5;

        return { song, rank };
      });

    const sortBySelectedMode = (left: Lyric, right: Lyric) => {
      if (filters.sortBy === 'NEWEST') {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        if (leftTime !== rightTime) {
          return rightTime - leftTime;
        }
      }

      if (filters.sortBy === 'OLDEST') {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
      }

      const numA = left.number ?? Number.MAX_SAFE_INTEGER;
      const numB = right.number ?? Number.MAX_SAFE_INTEGER;
      if (numA !== numB) {
        return numA - numB;
      }

      return left.title.localeCompare(right.title, 'am-ET');
    };

    rows.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      return sortBySelectedMode(a.song, b.song);
    });

    return rows.map((item) => item.song);
  }, [lyrics, filters]);

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
          <Text style={styles.loadingText}>{isEnglish ? 'Loading songs...' : 'መዝሙሮች በመጫን ላይ...'}</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}> 
      <TextInput
        value={filters.query}
        onChangeText={(value) => setFilters((prev) => ({ ...prev, query: value }))}
        placeholder={isEnglish ? 'Search song...' : 'መዝሙር ፈልግ...'}
        style={styles.search}
        placeholderTextColor={palette.textMuted}
      />

      <Text style={styles.filterLabel}>{isEnglish ? 'Scale' : 'ስኬል'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {scaleOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setFilters((prev) => ({ ...prev, scale: option.value }))}
            style={[styles.chip, filters.scale === option.value && styles.chipActive]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.chipText, filters.scale === option.value && styles.chipTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>{isEnglish ? 'Rhythm' : 'ሪትም'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsRow, styles.rhythmRow]}>
        {rhythmOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setFilters((prev) => ({ ...prev, rhythm: option.value }))}
            style={[styles.chip, filters.rhythm === option.value && styles.chipActive]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.chipText, filters.rhythm === option.value && styles.chipTextActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptionsRow}>
          {sortOptions.map((option) => {
            const active = filters.sortBy === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: option.value }))}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.sortInfo}>{isEnglish ? 'Results' : 'ውጤት'}: {visibleLyrics.length}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={visibleLyrics}
        keyExtractor={(item) => item.id}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > LYRICS_SCROLL_TOP_TRIGGER_OFFSET)}
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
          <Text style={styles.empty}>{isEnglish ? 'No matching songs found.' : 'ምንም ተመሳሳይ መዝሙር አልተገኘም።'}</Text>
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
            <>
            <ScrollView
              ref={detailScrollRef}
              contentContainerStyle={styles.modalBody}
              onScroll={(event) => setShowDetailScrollTop(event.nativeEvent.contentOffset.y > LYRICS_SCROLL_TOP_TRIGGER_OFFSET)}
              scrollEventThrottle={16}
            >
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
                  <Text style={styles.exportButtonText}>{exportingFormat === 'pdf' ? '...' : 'Download as PDF'}</Text>
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
            <ScrollToTopButton visible={showDetailScrollTop} onPress={() => detailScrollRef.current?.scrollTo({ y: 0, animated: true })} />
            </>
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
  search: {
    backgroundColor: palette.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.inputBorder,
    marginBottom: 4,
    color: palette.textDark,
    fontSize: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.blue900,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 2,
    paddingRight: 8,
    marginBottom: 8,
  },
  rhythmRow: {
    marginTop: 0,
  },
  chip: {
    minWidth: 78,
    maxWidth: 128,
    backgroundColor: palette.chipBackground,
    borderWidth: 1,
    borderColor: palette.chipBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  chipActive: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.chipActiveBackground,
    borderColor: palette.chipActiveBackground,
  },
  chipText: {
    color: palette.blue900,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  chipTextActive: {
    color: palette.chipActiveText,
  },
  sortRow: {
    marginTop: 0,
    marginBottom: 6,
    gap: 8,
  },
  sortOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: palette.chipBorder,
    backgroundColor: palette.chipBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 6,
  },
  sortChipActive: {
    backgroundColor: palette.chipActiveBackground,
    borderColor: palette.chipActiveBackground,
  },
  sortChipText: {
    color: palette.blue900,
    fontSize: 12,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: palette.chipActiveText,
  },
  sortInfo: {
    color: palette.blue900,
    fontWeight: '600',
    fontSize: 12,
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
