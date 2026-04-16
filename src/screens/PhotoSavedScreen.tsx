import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ChoirBackground } from '../components/ChoirBackground';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { useAppLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { getSavedMediaEntries, toggleSavedMedia } from '../services/mediaCollectionsService';
import { AppPalette } from '../theme/colors';
import { MediaCollectionEntry } from '../types';

export function PhotoSavedScreen() {
  const { palette } = useAppTheme();
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [items, setItems] = useState<MediaCollectionEntry[]>([]);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<FlatList<MediaCollectionEntry> | null>(null);

  const load = useCallback(async () => {
    setItems(await getSavedMediaEntries());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function removeSaved(item: MediaCollectionEntry) {
    const next = await toggleSavedMedia({
      itemId: item.itemId,
      itemType: item.itemType,
      title: item.title,
      subtitle: item.subtitle,
      photoUrl: item.photoUrl,
    });

    setItems((prev) => prev.filter((entry) => next.has(entry.key)));
  }

  function openPreview(photoUrl: string) {
    setPreviewPhotoUrl(photoUrl);
  }

  function closePreview() {
    setPreviewPhotoUrl(null);
  }

  return (
    <ChoirBackground>
      <View style={styles.container}>
        <Text style={styles.title}>{isEnglish ? 'Photo Saved' : 'የተቀመጡ ፎቶዎች'}</Text>

        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.key}
          onScroll={(event) => setShowScrollTop(event.nativeEvent.contentOffset.y > SCROLL_TO_TOP_TRIGGER_OFFSET)}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {isEnglish ? 'No saved member or memory photos yet.' : 'እስካሁን የተቀመጡ የአባላት ወይም የአፍታ ፎቶዎች የሉም።'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => openPreview(item.photoUrl)}>
                <Image source={{ uri: item.photoUrl }} style={styles.image} />
              </Pressable>
              <View style={styles.info}>
                <Text style={styles.name}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.meta}>{item.subtitle}</Text> : null}
                <Text style={styles.meta}>{item.itemType === 'member' ? (isEnglish ? 'Member' : 'አባል') : isEnglish ? 'Memory' : 'አፍታ'}</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={() => removeSaved(item)}>
                <Ionicons name="bookmark" size={18} color={palette.blue700} />
              </Pressable>
            </View>
          )}
        />
        <ScrollToTopButton visible={showScrollTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />
      </View>

      <Modal visible={previewPhotoUrl !== null} transparent animationType="fade" onRequestClose={closePreview}>
        <Pressable style={styles.previewBackdrop} onPress={closePreview}>
          {previewPhotoUrl ? <Image source={{ uri: previewPhotoUrl }} style={styles.previewImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </ChoirBackground>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.white,
      marginBottom: 8,
    },
    listContent: {
      gap: 8,
      paddingBottom: 12,
    },
    emptyText: {
      marginTop: 14,
      fontSize: 13,
      color: palette.white,
      textAlign: 'center',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.cardBackground,
      padding: 10,
    },
    image: {
      width: 64,
      height: 64,
      borderRadius: 10,
      backgroundColor: '#E2E8F0',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 13,
      color: palette.blue900,
      fontWeight: '800',
      marginBottom: 2,
    },
    meta: {
      fontSize: 12,
      color: palette.textMuted,
      lineHeight: 18,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.softAccentBackground,
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
  });
}
