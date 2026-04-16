import AsyncStorage from '@react-native-async-storage/async-storage';

import { MediaCollectionEntry, MediaItemType } from '../types';

const FAVORITE_MEDIA_KEY = 'jc_media_favorites_v1';
const SAVED_MEDIA_KEY = 'jc_media_saved_v1';

type CollectionMap = Record<string, MediaCollectionEntry>;

function makeMediaKey(itemType: MediaItemType, itemId: string) {
  return `${itemType}:${itemId}`;
}

async function readCollectionMap(storageKey: string): Promise<CollectionMap> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as CollectionMap;
  } catch {
    return {};
  }
}

async function writeCollectionMap(storageKey: string, value: CollectionMap) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

function toSortedEntries(value: CollectionMap) {
  return Object.values(value).sort((a, b) => b.savedAt - a.savedAt);
}

function toggleEntry(current: CollectionMap, entry: Omit<MediaCollectionEntry, 'key' | 'savedAt'>): CollectionMap {
  const key = makeMediaKey(entry.itemType, entry.itemId);
  const next = { ...current };

  if (next[key]) {
    delete next[key];
    return next;
  }

  next[key] = {
    ...entry,
    key,
    savedAt: Date.now(),
  };

  return next;
}

export async function getFavoriteMediaEntries() {
  const map = await readCollectionMap(FAVORITE_MEDIA_KEY);
  return toSortedEntries(map);
}

export async function getSavedMediaEntries() {
  const map = await readCollectionMap(SAVED_MEDIA_KEY);
  return toSortedEntries(map);
}

export async function getFavoriteMediaKeySet() {
  const map = await readCollectionMap(FAVORITE_MEDIA_KEY);
  return new Set(Object.keys(map));
}

export async function getSavedMediaKeySet() {
  const map = await readCollectionMap(SAVED_MEDIA_KEY);
  return new Set(Object.keys(map));
}

export async function toggleFavoriteMedia(entry: Omit<MediaCollectionEntry, 'key' | 'savedAt'>) {
  const current = await readCollectionMap(FAVORITE_MEDIA_KEY);
  const next = toggleEntry(current, entry);
  await writeCollectionMap(FAVORITE_MEDIA_KEY, next);
  return new Set(Object.keys(next));
}

export async function toggleSavedMedia(entry: Omit<MediaCollectionEntry, 'key' | 'savedAt'>) {
  const current = await readCollectionMap(SAVED_MEDIA_KEY);
  const next = toggleEntry(current, entry);
  await writeCollectionMap(SAVED_MEDIA_KEY, next);
  return new Set(Object.keys(next));
}

export function buildMediaKey(itemType: MediaItemType, itemId: string) {
  return makeMediaKey(itemType, itemId);
}
