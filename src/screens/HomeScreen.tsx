import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Modal, Platform } from 'react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { CHOIR_MEMBER_CATEGORY_OPTIONS, RHYTHM_OPTIONS, SCALE_OPTIONS } from '../constants/categories';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { fetchChoirMemories } from '../services/choirMemoriesService';
import { fetchChoirMembers } from '../services/choirMembersService';
import { getLyricsAnalytics } from '../services/lyricsService';
import { buildMediaKey, getFavoriteMediaKeySet, getSavedMediaKeySet, toggleFavoriteMedia, toggleSavedMedia } from '../services/mediaCollectionsService';
import { fetchMemberOptions } from '../services/memberOptionsService';
import { fetchMusicCategoryOptions } from '../services/musicCategoriesService';
import {
  DEFAULT_PAGE_CONTENT,
  DEFAULT_PAGE_CONTENT_EN,
  DEFAULT_PAGE_TEXT_STYLE,
  getPageContentSettingsByLanguage,
  getPageTextStyleSettings,
} from '../services/settingsService';
import { AppPalette } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import { CategoryOption, ChoirMember, ChoirMemberCategory, ChoirMemoryPhoto, LyricsAnalytics, MediaCollectionEntry, PageContentSettings, TextStyleSettings } from '../types';

export function HomeScreen() {
  const { palette, isDark } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const titleSize = width < 420 ? 20 : width < 900 ? 24 : 30;
  const panelPadding = width < 420 ? 14 : 18;
  const [content, setContent] = useState<PageContentSettings>(isEnglish ? DEFAULT_PAGE_CONTENT_EN : DEFAULT_PAGE_CONTENT);
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);
  const [analytics, setAnalytics] = useState<LyricsAnalytics>({ totalSongs: 0, byScale: {}, byRhythm: {} });
  const [members, setMembers] = useState<ChoirMember[]>([]);
  const [memories, setMemories] = useState<ChoirMemoryPhoto[]>([]);
  const [expandedStatusNotes, setExpandedStatusNotes] = useState<Record<string, boolean>>({});
  const [expandedMemoryNotes, setExpandedMemoryNotes] = useState<Record<string, boolean>>({});
  const [downloadingMemoryId, setDownloadingMemoryId] = useState<string | null>(null);
  const [downloadingMemberId, setDownloadingMemberId] = useState<string | null>(null);
  const [favoriteMediaKeys, setFavoriteMediaKeys] = useState<Set<string>>(new Set());
  const [savedMediaKeys, setSavedMediaKeys] = useState<Set<string>>(new Set());
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [activeMemberCategory, setActiveMemberCategory] = useState<'ALL' | ChoirMemberCategory>('ALL');
  const [scaleOptions, setScaleOptions] = useState<CategoryOption[]>(SCALE_OPTIONS);
  const [rhythmOptions, setRhythmOptions] = useState<CategoryOption[]>(RHYTHM_OPTIONS);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const [memberCategoryOptions, setMemberCategoryOptions] = useState<CategoryOption[]>(
    CHOIR_MEMBER_CATEGORY_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  );

  const loadContent = useCallback(async () => {
    const [pageResult, styleResult, analyticsResult, membersResult, memoriesResult] = await Promise.allSettled([
      getPageContentSettingsByLanguage(language),
      getPageTextStyleSettings(),
      getLyricsAnalytics(),
      fetchChoirMembers(),
      fetchChoirMemories(),
    ]);

    if (pageResult.status === 'fulfilled') {
      setContent(pageResult.value);
    }

    if (styleResult.status === 'fulfilled') {
      setPageTextStyle(styleResult.value);
    }

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(analyticsResult.value);
    }

    if (membersResult.status === 'fulfilled') {
      setMembers(membersResult.value);
    }

    if (memoriesResult.status === 'fulfilled') {
      setMemories(memoriesResult.value);
    }

    fetchMusicCategoryOptions('scale', true).then(setScaleOptions).catch(() => {
      // Keep defaults when categories are unavailable.
    });
    fetchMusicCategoryOptions('rhythm', true).then(setRhythmOptions).catch(() => {
      // Keep defaults when categories are unavailable.
    });
    fetchMemberOptions('member_category').then(setMemberCategoryOptions).catch(() => {
      // Keep defaults when options are unavailable.
    });

    const [favoriteKeys, savedKeys] = await Promise.all([getFavoriteMediaKeySet(), getSavedMediaKeySet()]);
    setFavoriteMediaKeys(favoriteKeys);
    setSavedMediaKeys(savedKeys);
  }, [language]);

  const scaleCounters = useMemo(
    () =>
      scaleOptions.filter((item) => item.value !== 'ALL').map((item) => ({
        label: item.label,
        count: analytics.byScale[item.value] ?? 0,
      })),
    [analytics.byScale, scaleOptions],
  );

  const rhythmCounters = useMemo(
    () =>
      rhythmOptions.filter((item) => item.value !== 'ALL').map((item) => ({
        label: item.label,
        count: analytics.byRhythm[item.value] ?? 0,
      })),
    [analytics.byRhythm, rhythmOptions],
  );

  const memberCategoryLabelMap = useMemo(() => {
    return memberCategoryOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, [memberCategoryOptions]);

  const memberCategoryTabs = useMemo(() => {
    const allCount = members.length;
    const categoryCounts = members.reduce<Record<string, number>>((acc, member) => {
      for (const category of member.member_categories) {
        acc[category] = (acc[category] ?? 0) + 1;
      }
      return acc;
    }, {});

    return [
      { value: 'ALL' as const, label: isEnglish ? 'All Members' : 'ሁሉም አባላት', count: allCount },
      ...memberCategoryOptions.map((option) => ({
        value: option.value,
        label: option.label,
        count: categoryCounts[option.value] ?? 0,
      })),
    ];
  }, [isEnglish, members, memberCategoryOptions]);

  const memberNameCollator = useMemo(
    () =>
      new Intl.Collator(isEnglish ? 'en-US' : 'am-ET', {
        sensitivity: 'base',
        numeric: true,
      }),
    [isEnglish],
  );

  const visibleMembers = useMemo(() => {
    const filtered =
      activeMemberCategory === 'ALL'
        ? members
        : members.filter((member) => member.member_categories.includes(activeMemberCategory));

    return [...filtered].sort((a, b) => memberNameCollator.compare(a.full_name.trim(), b.full_name.trim()));
  }, [activeMemberCategory, memberNameCollator, members]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [loadContent]),
  );

  function toSafePhotoName(value: string) {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 64);
  }

  async function downloadPhotoToDevice(photoUrl: string, targetFileName: string) {
    if (Platform.OS === 'web') {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = targetFileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      return;
    }

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(isEnglish ? 'Permission Required' : 'ፍቃድ ያስፈልጋል', isEnglish ? 'Please allow photo access to save images.' : 'ፎቶ ለማስቀመጥ የፎቶ ፍቃድ ይፍቀዱ።');
      return;
    }

    const destination = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${targetFileName}`;
    const downloaded = await FileSystem.downloadAsync(photoUrl, destination);
    await MediaLibrary.saveToLibraryAsync(downloaded.uri);
  }

  async function downloadMemoryPhoto(memory: ChoirMemoryPhoto) {
    if (downloadingMemoryId) {
      return;
    }

    setDownloadingMemoryId(memory.id);

    try {
      const fallbackName = memory.title ? toSafePhotoName(memory.title) : `choir_memory_${memory.id.slice(0, 8)}`;
      const targetFileName = `${fallbackName || 'choir_memory'}.jpg`;

      await downloadPhotoToDevice(memory.photo_url, targetFileName);

      Alert.alert(isEnglish ? 'Downloaded' : 'ተቀምጧል', isEnglish ? 'Photo saved to your gallery.' : 'ፎቶው ወደ ጋለሪ ተቀምጧል።');
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Failed to download photo.' : 'ፎቶ ማውረድ አልተቻለም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
    } finally {
      setDownloadingMemoryId(null);
    }
  }

  async function downloadMemberPhoto(member: ChoirMember) {
    if (!member.photo_url || downloadingMemberId) {
      return;
    }

    setDownloadingMemberId(member.id);

    try {
      const fallbackName = member.full_name ? toSafePhotoName(member.full_name) : `choir_member_${member.id.slice(0, 8)}`;
      const targetFileName = `${fallbackName || 'choir_member'}.jpg`;

      await downloadPhotoToDevice(member.photo_url, targetFileName);
      Alert.alert(isEnglish ? 'Downloaded' : 'ተቀምጧል', isEnglish ? 'Photo saved to your gallery.' : 'ፎቶው ወደ ጋለሪ ተቀምጧል።');
    } catch (error) {
      const message = error instanceof Error ? error.message : isEnglish ? 'Failed to download photo.' : 'ፎቶ ማውረድ አልተቻለም።';
      Alert.alert(isEnglish ? 'Error' : 'ስህተት', message);
    } finally {
      setDownloadingMemberId(null);
    }
  }

  function openPhotoPreview(photoUrl: string) {
    setPreviewPhotoUrl(photoUrl);
  }

  function closePhotoPreview() {
    setPreviewPhotoUrl(null);
  }

  async function onToggleMediaFavorite(entry: Omit<MediaCollectionEntry, 'key' | 'savedAt'>) {
    const next = await toggleFavoriteMedia(entry);
    setFavoriteMediaKeys(next);
  }

  async function onToggleMediaSaved(entry: Omit<MediaCollectionEntry, 'key' | 'savedAt'>) {
    const next = await toggleSavedMedia(entry);
    setSavedMediaKeys(next);
  }

  return (
    <ChoirBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
        scrollEventThrottle={16}
      >
        <View style={styles.logoWrap}>
          <Ionicons name="musical-note" size={36} color={palette.white} />
          <Text style={[styles.title, { fontSize: titleSize }]}>
            {isEnglish ? 'Johanan Choir Lyrics and Gallery' : 'የዮሐናን መዘምራን ሕብረት መዝሙሮች እና ጋለሪ'}
          </Text>
          <Text style={styles.subtitle}>{isEnglish ? 'Johanan Choir Lyrics' : 'Johanan Choir'}</Text>
        </View>

        <View style={[styles.panel, { padding: panelPadding }]}> 
          <Text style={[styles.panelTitle, buildFormattedTextStyle(pageTextStyle)]}>{content.homePanelTitle}</Text>
          <Text style={[styles.panelText, buildFormattedTextStyle(pageTextStyle)]}>{content.homePanelText}</Text>

          <View style={styles.analyticsWrap}>
            <View style={styles.totalCardsRow}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>{isEnglish ? 'Total Songs' : 'ጠቅላላ መዝሙሮች'}</Text>
                <Text style={styles.totalValue}>{analytics.totalSongs}</Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>{isEnglish ? 'Total Members' : 'ጠቅላላ አባላት'}</Text>
                <Text style={styles.totalValue}>{members.length}</Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>{isEnglish ? 'Total Photos' : 'ጠቅላላ ፎቶዎች'}</Text>
                <Text style={styles.totalValue}>{memories.length}</Text>
              </View>
            </View>

            <Text style={styles.analyticsTitle}>{isEnglish ? 'Songs Per Scale' : 'በስኬል የመዝሙር ብዛት'}</Text>
            <View style={styles.counterGrid}>
              {scaleCounters.map((item) => (
                <View key={item.label} style={styles.counterCard}>
                  <Text style={styles.counterLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.counterValue}>{item.count}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.analyticsTitle}>{isEnglish ? 'Songs Per Rhythm' : 'በሪትም የመዝሙር ብዛት'}</Text>
            <View style={styles.counterGrid}>
              {rhythmCounters.map((item) => (
                <View key={item.label} style={styles.counterCard}>
                  <Text style={styles.counterLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.counterValue}>{item.count}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.membersHeader}>{isEnglish ? 'Choir Members' : 'የመዘምራን አባላት'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersTabsRow}>
              {memberCategoryTabs.map((tab) => {
                const isActive = tab.value === activeMemberCategory;

                return (
                  <Pressable
                    key={tab.value}
                    style={[styles.memberTab, isActive && styles.memberTabActive]}
                    onPress={() => setActiveMemberCategory(tab.value)}
                  >
                    <Text style={[styles.memberTabText, isActive && styles.memberTabTextActive]}>
                      {tab.label} ({tab.count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.membersGrid}>
              {visibleMembers.length === 0 ? (
                <Text style={styles.emptyMembersText}>
                  {isEnglish ? 'No members found in this category yet.' : 'በዚህ ምድብ ውስጥ አባላት አልተገኙም።'}
                </Text>
              ) : (
                visibleMembers.map((member) => (
                  <View key={member.id} style={styles.memberCard}>
                    {member.photo_url ? (
                      <View style={styles.memberPhotoWrap}>
                        <Pressable onPress={() => openPhotoPreview(member.photo_url!)}>
                          <Image source={{ uri: member.photo_url }} style={styles.memberPhoto} />
                        </Pressable>
                        <View style={styles.memberPhotoActionsBar}>
                          <Pressable
                            style={styles.memberPhotoActionButton}
                            onPress={() =>
                              onToggleMediaFavorite({
                                itemId: member.id,
                                itemType: 'member',
                                title: member.full_name,
                                subtitle: member.member_categories.join(', '),
                                photoUrl: member.photo_url!,
                              })
                            }
                          >
                            <Ionicons
                              name={favoriteMediaKeys.has(buildMediaKey('member', member.id)) ? 'heart' : 'heart-outline'}
                              size={16}
                              color={palette.white}
                            />
                          </Pressable>
                          <Pressable
                            style={styles.memberPhotoActionButton}
                            onPress={() =>
                              onToggleMediaSaved({
                                itemId: member.id,
                                itemType: 'member',
                                title: member.full_name,
                                subtitle: member.member_categories.join(', '),
                                photoUrl: member.photo_url!,
                              })
                            }
                          >
                            <Ionicons
                              name={savedMediaKeys.has(buildMediaKey('member', member.id)) ? 'bookmark' : 'bookmark-outline'}
                              size={16}
                              color={palette.white}
                            />
                          </Pressable>
                          <Pressable
                            style={styles.memberPhotoActionButton}
                            onPress={() => downloadMemberPhoto(member)}
                            disabled={downloadingMemberId !== null}
                          >
                            <Ionicons
                              name={downloadingMemberId === member.id ? 'hourglass' : 'download-outline'}
                              size={16}
                              color={palette.white}
                            />
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.memberPhotoPlaceholder}>
                        <Ionicons name="person" size={20} color={palette.softAccentText} />
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.full_name}</Text>
                      <Text style={styles.memberMeta}>
                        {member.member_categories.length > 0
                          ? member.member_categories.map((category) => memberCategoryLabelMap[category] ?? category).join(', ')
                          : '-'}
                      </Text>
                      <Text style={styles.memberMeta}>{isEnglish ? 'Batch' : 'ባች'}: {member.batch_year ?? '-'}</Text>
                      <Text style={styles.memberMeta}>{isEnglish ? 'Joined' : 'የገባበት'}: {member.joined_date ?? '-'}</Text>
                      <Text style={styles.memberMeta}>{isEnglish ? 'Status' : 'ሁኔታ'}: {member.marital_status} • {member.education_status}</Text>
                      {member.occupation ? <Text style={styles.memberMeta}>{isEnglish ? 'Occupation' : 'ሙያ'}: {member.occupation}</Text> : null}
                      {member.address ? <Text style={styles.memberMeta}>{isEnglish ? 'Address' : 'አድራሻ'}: {member.address}</Text> : null}
                      {member.current_status_note ? (
                        <View style={styles.statusNoteWrap}>
                          <Text
                            style={styles.memberMeta}
                            numberOfLines={expandedStatusNotes[member.id] ? undefined : 2}
                          >
                            {isEnglish ? 'Note' : 'ማስታወሻ'}: {member.current_status_note}
                          </Text>
                          {member.current_status_note.trim().length > 90 ? (
                            <Pressable
                              style={styles.seeMoreButton}
                              onPress={() =>
                                setExpandedStatusNotes((prev) => ({
                                  ...prev,
                                  [member.id]: !prev[member.id],
                                }))
                              }
                            >
                              <Text style={styles.seeMoreButtonText}>
                                {expandedStatusNotes[member.id]
                                  ? isEnglish
                                    ? 'See less'
                                    : 'በአጭር አሳይ'
                                  : isEnglish
                                    ? 'See more'
                                    : 'ተጨማሪ አሳይ'}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.membersHeader}>{isEnglish ? 'Memorable Moments' : 'ልዩ እና ታሪካዊ አፍታዎች'}</Text>
            <View style={styles.memoriesGrid}>
              {memories.length === 0 ? (
                <Text style={styles.emptyMembersText}>
                  {isEnglish ? 'No memorable photos uploaded yet.' : 'እስካሁን የተጫኑ ልዩ ፎቶዎች የሉም።'}
                </Text>
              ) : (
                memories.map((memory) => (
                  <View key={memory.id} style={styles.memoryCard}>
                    <View style={styles.memoryImageWrap}>
                      <Pressable onPress={() => openPhotoPreview(memory.photo_url)}>
                        <Image source={{ uri: memory.photo_url }} style={styles.memoryPhoto} />
                      </Pressable>
                      <Pressable
                        style={styles.memoryFavoriteButton}
                        onPress={() =>
                          onToggleMediaFavorite({
                            itemId: memory.id,
                            itemType: 'memory',
                            title: memory.title ?? (isEnglish ? 'Untitled Moment' : 'ያልተሰየመ አፍታ'),
                            subtitle: memory.description ?? null,
                            photoUrl: memory.photo_url,
                          })
                        }
                      >
                        <Ionicons
                          name={favoriteMediaKeys.has(buildMediaKey('memory', memory.id)) ? 'heart' : 'heart-outline'}
                          size={16}
                          color={palette.white}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.memorySavedButton}
                        onPress={() =>
                          onToggleMediaSaved({
                            itemId: memory.id,
                            itemType: 'memory',
                            title: memory.title ?? (isEnglish ? 'Untitled Moment' : 'ያልተሰየመ አፍታ'),
                            subtitle: memory.description ?? null,
                            photoUrl: memory.photo_url,
                          })
                        }
                      >
                        <Ionicons
                          name={savedMediaKeys.has(buildMediaKey('memory', memory.id)) ? 'bookmark' : 'bookmark-outline'}
                          size={16}
                          color={palette.white}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.memoryDownloadButton}
                        onPress={() => downloadMemoryPhoto(memory)}
                        disabled={downloadingMemoryId !== null}
                      >
                        <Ionicons
                          name={downloadingMemoryId === memory.id ? 'hourglass' : 'download-outline'}
                          size={16}
                          color={palette.white}
                        />
                      </Pressable>
                    </View>
                    {memory.title ? <Text style={styles.memoryTitle}>{memory.title}</Text> : null}
                    {memory.description ? (
                      <View style={styles.statusNoteWrap}>
                        <Text style={styles.memberMeta} numberOfLines={expandedMemoryNotes[memory.id] ? undefined : 2}>
                          {memory.description}
                        </Text>
                        {memory.description.trim().length > 90 ? (
                          <Pressable
                            style={styles.seeMoreButton}
                            onPress={() =>
                              setExpandedMemoryNotes((prev) => ({
                                ...prev,
                                [memory.id]: !prev[memory.id],
                              }))
                            }
                          >
                            <Text style={styles.seeMoreButtonText}>
                              {expandedMemoryNotes[memory.id]
                                ? isEnglish
                                  ? 'See less'
                                  : 'በአጭር አሳይ'
                                : isEnglish
                                  ? 'See more'
                                  : 'ተጨማሪ አሳይ'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <ScrollToTopButton visible={showScrollTop} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />

      <Modal visible={previewPhotoUrl !== null} transparent animationType="fade" onRequestClose={closePhotoPreview}>
        <Pressable style={styles.previewBackdrop} onPress={closePhotoPreview}>
          {previewPhotoUrl ? <Image source={{ uri: previewPhotoUrl }} style={styles.previewImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </ChoirBackground>
  );
}

function createStyles(palette: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
  container: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 18,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: isDark ? '#BFDBFE' : '#DBEAFE',
  },
  panel: {
    backgroundColor: palette.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.blue900,
    marginBottom: 8,
  },
  panelText: {
    fontSize: 12,
    color: palette.textDark,
    lineHeight: 24,
  },
  analyticsWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.cardBorder,
    paddingTop: 12,
    gap: 8,
  },
  totalCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  totalCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.chipBorder,
    backgroundColor: palette.softAccentBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: palette.softAccentText,
    fontWeight: '700',
  },
  totalValue: {
    marginTop: 2,
    fontSize: 24,
    color: palette.blue900,
    fontWeight: '800',
  },
  analyticsTitle: {
    fontSize: 12,
    color: palette.blue900,
    fontWeight: '700',
    marginTop: 4,
  },
  counterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  counterCard: {
    minWidth: 98,
    maxWidth: 170,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.pageBackground,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  counterLabel: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  counterValue: {
    marginTop: 2,
    fontSize: 18,
    color: palette.blue900,
    fontWeight: '800',
  },
  membersHeader: {
    marginTop: 8,
    fontSize: 13,
    color: palette.blue900,
    fontWeight: '800',
  },
  membersTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  memberTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.chipBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.chipBackground,
  },
  memberTabActive: {
    backgroundColor: palette.chipActiveBackground,
    borderColor: palette.chipActiveBackground,
  },
  memberTabText: {
    fontSize: 12,
    color: palette.blue900,
    fontWeight: '700',
  },
  memberTabTextActive: {
    color: palette.chipActiveText,
  },
  membersGrid: {
    gap: 8,
    marginTop: 4,
  },
  memoriesGrid: {
    gap: 8,
    marginTop: 4,
  },
  memoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.pageBackground,
    padding: 10,
  },
  memoryImageWrap: {
    position: 'relative',
  },
  memoryPhoto: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
  },
  memoryDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryFavoriteButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memorySavedButton: {
    position: 'absolute',
    top: 8,
    left: 44,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  memoryTitle: {
    fontSize: 13,
    color: palette.blue900,
    fontWeight: '800',
    marginBottom: 2,
  },
  emptyMembersText: {
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  memberCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.pageBackground,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  memberPhoto: {
    width: 128,
    height: 128,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  memberPhotoWrap: {
    position: 'relative',
  },
  memberPhotoActionsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  memberPhotoActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberPhotoPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.softAccentBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    color: palette.blue900,
    fontWeight: '800',
    marginBottom: 2,
  },
  memberMeta: {
    fontSize: 12,
    color: palette.textDark,
    lineHeight: 18,
  },
  statusNoteWrap: {
    marginTop: 2,
  },
  seeMoreButton: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  seeMoreButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.blue700,
  },
  });
}
