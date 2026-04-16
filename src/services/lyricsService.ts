import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { LyricsAnalytics, LyricsFilters, Lyric } from '../types';
import { getDeviceId } from './device';

const CACHE_KEY = 'jc_lyrics_cache_v1';
const FAVORITES_KEY = 'jc_favorites_v1';
const LIKED_KEY = 'jc_liked_v1';
const LYRIC_AUDIO_BUCKET = 'lyric-audios';

function toPublicAudioUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const cleaned = pathOrUrl.replace(/^\/+/, '');
  const bucketPrefix = `${LYRIC_AUDIO_BUCKET}/`;
  const path = cleaned.startsWith(bucketPrefix)
    ? cleaned.slice(bucketPrefix.length)
    : cleaned;

  const { data } = supabase.storage.from(LYRIC_AUDIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function normalizeAudioSourceUri(sourceUri: string) {
  const trimmed = sourceUri.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^file:|^content:|^blob:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return encodeURI(trimmed);
  }

  return encodeURI(toPublicAudioUrl(trimmed));
}

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? fallback));
  }

  return new Error(fallback);
}

function getAudioExtFromUri(uri: string) {
  const parsed = uri.split('?')[0];
  const ext = parsed.split('.').pop()?.toLowerCase();
  return ext?.replace(/[^a-z0-9]/gi, '') || '';
}

function getAudioExtFromName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext?.replace(/[^a-z0-9]/gi, '') || '';
}

function resolveAudioUploadExt(fileUri: string, fileName?: string | null) {
  const byName = fileName ? getAudioExtFromName(fileName) : '';
  if (byName) {
    return byName;
  }

  const byUri = getAudioExtFromUri(fileUri);
  if (byUri) {
    return byUri;
  }

  return 'bin';
}

function getAudioContentType(ext: string, mimeType?: string | null) {
  if (mimeType && /^audio\//i.test(mimeType)) {
    return mimeType;
  }

  if (ext === 'm4a') {
    return 'audio/mp4';
  }

  if (ext === 'aac') {
    return 'audio/aac';
  }

  if (ext === 'wav') {
    return 'audio/wav';
  }

  if (ext === 'ogg') {
    return 'audio/ogg';
  }

  if (ext === 'flac') {
    return 'audio/flac';
  }

  if (ext === 'opus') {
    return 'audio/opus';
  }

  if (ext === 'oga') {
    return 'audio/ogg';
  }

  if (ext === 'webm') {
    return 'audio/webm';
  }

  if (ext === 'aiff' || ext === 'aif') {
    return 'audio/aiff';
  }

  if (ext === 'amr') {
    return 'audio/amr';
  }

  if (ext === 'mid' || ext === 'midi') {
    return 'audio/midi';
  }

  if (ext === '3gp') {
    return 'audio/3gpp';
  }

  if (ext === 'mp3') {
    return 'audio/mpeg';
  }

  return 'application/octet-stream';
}

function isLocalAudioUri(uri: string) {
  return /^file:|^content:|^blob:/i.test(uri);
}
export async function resolveLyricAudioUri(_lyricId: string, sourceUri: string) {
  return normalizeAudioSourceUri(sourceUri);
}

export async function prefetchLyricAudioCache(_lyrics: Lyric[]) {
  // No-op by design: direct streaming keeps attachment behavior predictable.
}

export async function fetchLyricsFromCache(): Promise<Lyric[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Lyric[];
  } catch {
    return [];
  }
}

async function saveLyricsCache(lyrics: Lyric[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(lyrics));
}

function sortLyricsForCache(lyrics: Lyric[]) {
  return [...lyrics].sort((a, b) => {
    const numA = a.number ?? Number.MAX_SAFE_INTEGER;
    const numB = b.number ?? Number.MAX_SAFE_INTEGER;
    if (numA !== numB) {
      return numA - numB;
    }

    return a.title.localeCompare(b.title, 'am-ET');
  });
}

export async function fetchLyrics(): Promise<Lyric[]> {
  const { data, error } = await supabase
    .from('lyrics')
    .select('*')
    .order('number', { ascending: true, nullsFirst: false });

  if (error || !data) {
    return fetchLyricsFromCache();
  }

  await saveLyricsCache(data as Lyric[]);
  return data as Lyric[];
}

export async function getLyricsAnalytics(): Promise<LyricsAnalytics> {
  const lyrics = await fetchLyrics();

  return lyrics.reduce<LyricsAnalytics>(
    (acc, song) => {
      acc.totalSongs += 1;
      acc.byScale[song.scale] = (acc.byScale[song.scale] ?? 0) + 1;
      acc.byRhythm[song.rhythm] = (acc.byRhythm[song.rhythm] ?? 0) + 1;
      return acc;
    },
    {
      totalSongs: 0,
      byScale: {},
      byRhythm: {},
    },
  );
}

export function applyFilters(lyrics: Lyric[], filters: LyricsFilters) {
  const query = filters.query.trim().toLowerCase();

  const filtered = lyrics.filter((song) => {
    const matchesQuery =
      query.length === 0 ||
      song.title.toLowerCase().includes(query) ||
      song.content.toLowerCase().includes(query);

    const matchesScale = filters.scale === 'ALL' || song.scale === filters.scale;
    const matchesRhythm = filters.rhythm === 'ALL' || song.rhythm === filters.rhythm;

    return matchesQuery && matchesScale && matchesRhythm;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'NEWEST') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    }

    if (filters.sortBy === 'OLDEST') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    }

    if (filters.sortBy === 'ALPHA') {
      return a.title.localeCompare(b.title, 'am-ET');
    }

    const numA = a.number ?? Number.MAX_SAFE_INTEGER;
    const numB = b.number ?? Number.MAX_SAFE_INTEGER;
    return numA - numB;
  });
}

async function readSet(key: string) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return new Set<string>();
  }

  try {
    return new Set<string>(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

async function writeSet(key: string, set: Set<string>) {
  await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export async function getFavorites() {
  return readSet(FAVORITES_KEY);
}

export async function toggleFavorite(lyricId: string) {
  const favorites = await readSet(FAVORITES_KEY);

  if (favorites.has(lyricId)) {
    favorites.delete(lyricId);
  } else {
    favorites.add(lyricId);
  }

  await writeSet(FAVORITES_KEY, favorites);
  return favorites;
}

export async function getLikedSet() {
  return readSet(LIKED_KEY);
}

export async function toggleLike(lyricId: string) {
  const liked = await readSet(LIKED_KEY);
  const deviceId = await getDeviceId();

  const likedNow = !liked.has(lyricId);
  if (likedNow) {
    liked.add(lyricId);
  } else {
    liked.delete(lyricId);
  }

  await writeSet(LIKED_KEY, liked);

  const { error } = await supabase.from('lyric_likes').upsert(
    {
      lyric_id: lyricId,
      device_id: deviceId,
      is_active: likedNow,
    },
    { onConflict: 'lyric_id,device_id' },
  );

  if (error) {
    // Keep local state even when server tracking is unavailable.
  }

  return liked;
}

export async function createLyric(lyric: Omit<Lyric, 'id' | 'likes_count' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('lyrics')
    .insert({
      ...lyric,
      likes_count: 0,
    })
    .select('*')
    .single();

  if (error) {
    throw toError(error, 'መዝሙር ማስቀመጥ አልተቻለም።');
  }

  if (data) {
    const cached = await fetchLyricsFromCache();
    const next = sortLyricsForCache([...(cached.filter((item) => item.id !== data.id) as Lyric[]), data as Lyric]);
    await saveLyricsCache(next);
  }
}

export async function updateLyric(id: string, lyric: Partial<Lyric>) {
  const { data, error } = await supabase
    .from('lyrics')
    .update(lyric)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw toError(error, 'መዝሙር ማሻሻል አልተቻለም።');
  }

  if (data) {
    const cached = await fetchLyricsFromCache();
    const next = sortLyricsForCache(
      cached.map((item) => (item.id === id ? (data as Lyric) : item)),
    );
    await saveLyricsCache(next);
  }
}

export async function deleteLyric(id: string) {
  const { error } = await supabase.from('lyrics').delete().eq('id', id);

  if (error) {
    throw toError(error, 'መዝሙር ማጥፋት አልተቻለም።');
  }

  const cached = await fetchLyricsFromCache();
  const next = cached.filter((item) => item.id !== id);
  await saveLyricsCache(next);
}

export async function uploadLyricAudio(
  fileUri: string,
  options?: { fileName?: string | null; mimeType?: string | null },
) {
  const safeExt = resolveAudioUploadExt(fileUri, options?.fileName);
  const fileName = `lyric-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const filePath = `tracks/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(LYRIC_AUDIO_BUCKET)
    .upload(filePath, blob, { contentType: getAudioContentType(safeExt, options?.mimeType), upsert: false });

  if (error) {
    throw toError(error, 'የድምጽ ፋይል መስቀል አልተቻለም።');
  }

  const { data } = supabase.storage.from(LYRIC_AUDIO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
