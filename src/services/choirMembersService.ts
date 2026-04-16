import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ChoirMember, ChoirMemberCategory, ChoirMemberInput } from '../types';

const PHOTO_BUCKET = 'choir-members';
const CHOIR_MEMBERS_CACHE_KEY = 'jc_choir_members_cache_v1';

type ChoirMemberRow = ChoirMember & { member_category?: ChoirMemberCategory };

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? fallback));
  }

  return new Error(fallback);
}

function normalizeChoirMembers(rows: ChoirMemberRow[]) {
  return rows.map((row) => {
    const categories = Array.isArray(row.member_categories)
      ? row.member_categories
      : row.member_category
        ? [row.member_category]
        : [];

    return {
      ...row,
      member_categories: categories,
      member_category: categories[0],
    };
  });
}

async function readChoirMembersCache(): Promise<ChoirMember[]> {
  const raw = await AsyncStorage.getItem(CHOIR_MEMBERS_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ChoirMember[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeChoirMembersCache(rows: ChoirMember[]) {
  await AsyncStorage.setItem(CHOIR_MEMBERS_CACHE_KEY, JSON.stringify(rows));
}

function shouldFallbackToInlinePhoto(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /bucket not found|storage|network|timeout|failed to fetch/i.test(message);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }

  return btoa(binary);
}

async function fileUriToDataUrl(fileUri: string, fileExt: string) {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = bytesToBase64(new Uint8Array(buffer));
  const mime = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function fetchChoirMembers() {
  try {
    const { data, error } = await supabase
      .from('choir_members')
      .select('*')
      .order('full_name', { ascending: true });

    if (error || !data) {
      throw toError(error, 'የመዘምራን አባላት መረጃ መጫን አልተቻለም።');
    }

    const normalized = normalizeChoirMembers(data as ChoirMemberRow[]);
    await writeChoirMembersCache(normalized);
    return normalized;
  } catch (error) {
    const cached = await readChoirMembersCache();
    if (cached.length > 0) {
      return cached;
    }

    throw toError(error, 'የመዘምራን አባላት መረጃ መጫን አልተቻለም።');
  }
}

export async function createChoirMember(payload: ChoirMemberInput) {
  const categories = payload.member_categories ?? [];
  const { data, error } = await supabase
    .from('choir_members')
    .insert({
      ...payload,
      member_categories: categories,
      member_category: categories[0] ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw toError(error, 'አባል መጨመር አልተቻለም።');
  }

  if (data) {
    const normalized = normalizeChoirMembers([data as ChoirMemberRow])[0];
    const cached = await readChoirMembersCache();
    const next = [...cached.filter((item) => item.id !== normalized.id), normalized].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, 'am-ET'),
    );
    await writeChoirMembersCache(next);
  }
}

export async function updateChoirMember(id: string, payload: ChoirMemberInput) {
  const categories = payload.member_categories ?? [];
  const { data, error } = await supabase
    .from('choir_members')
    .update({
      ...payload,
      member_categories: categories,
      member_category: categories[0] ?? null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw toError(error, 'አባል ማስተካከል አልተቻለም።');
  }

  if (data) {
    const normalized = normalizeChoirMembers([data as ChoirMemberRow])[0];
    const cached = await readChoirMembersCache();
    const next = [...cached.filter((item) => item.id !== id), normalized].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, 'am-ET'),
    );
    await writeChoirMembersCache(next);
  }
}

export async function updateChoirMemberPhoto(id: string, photoUrl: string | null) {
  const { data, error } = await supabase
    .from('choir_members')
    .update({
      photo_url: photoUrl,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw toError(error, 'የአባል ፎቶ ማስተካከል አልተቻለም።');
  }

  if (data) {
    const normalized = normalizeChoirMembers([data as ChoirMemberRow])[0];
    const cached = await readChoirMembersCache();
    const next = [...cached.filter((item) => item.id !== id), normalized].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, 'am-ET'),
    );
    await writeChoirMembersCache(next);
  }
}

export async function deleteChoirMember(id: string) {
  const { error } = await supabase.from('choir_members').delete().eq('id', id);

  if (error) {
    throw toError(error, 'አባል ማጥፋት አልተቻለም።');
  }

  const cached = await readChoirMembersCache();
  await writeChoirMembersCache(cached.filter((item) => item.id !== id));
}

export async function uploadChoirMemberPhoto(fileUri: string) {
  const fileExt = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = fileExt.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const fileName = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const filePath = `photos/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  try {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, blob, { contentType: `image/${safeExt}`, upsert: false });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    if (shouldFallbackToInlinePhoto(error)) {
      // Fallback: store image inline in DB when storage bucket is missing/unavailable.
      return fileUriToDataUrl(fileUri, safeExt);
    }

    throw toError(error, 'ፎቶ መስቀል አልተቻለም።');
  }
}
