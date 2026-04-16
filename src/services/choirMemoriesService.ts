import { supabase } from '../lib/supabase';
import { ChoirMemoryPhoto } from '../types';

const MEMORY_BUCKET = 'choir-memories';

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? fallback));
  }

  return new Error(fallback);
}

function getImageExtFromUri(uri: string) {
  const parsed = uri.split('?')[0];
  const ext = parsed.split('.').pop()?.toLowerCase();
  return ext?.replace(/[^a-z0-9]/gi, '') || 'jpg';
}

function getImageContentType(ext: string) {
  if (ext === 'png') {
    return 'image/png';
  }

  if (ext === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function fetchChoirMemories() {
  const { data, error } = await supabase
    .from('choir_memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw toError(error, 'Unable to fetch choir memories.');
  }

  return data as ChoirMemoryPhoto[];
}

export async function createChoirMemory(payload: { title: string | null; description: string | null; photo_url: string }) {
  const { error } = await supabase.from('choir_memories').insert(payload);

  if (error) {
    throw toError(error, 'Unable to save choir memory.');
  }
}

export async function updateChoirMemory(id: string, payload: { title: string | null; description: string | null; photo_url: string }) {
  const { error } = await supabase.from('choir_memories').update(payload).eq('id', id);

  if (error) {
    throw toError(error, 'Unable to update choir memory.');
  }
}

export async function deleteChoirMemory(id: string) {
  const { error } = await supabase.from('choir_memories').delete().eq('id', id);

  if (error) {
    throw toError(error, 'Unable to delete choir memory.');
  }
}

export async function uploadChoirMemoryPhoto(fileUri: string) {
  const safeExt = getImageExtFromUri(fileUri);
  const fileName = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const filePath = `photos/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(MEMORY_BUCKET)
    .upload(filePath, blob, { contentType: getImageContentType(safeExt), upsert: false });

  if (error) {
    throw toError(error, 'Unable to upload choir memory photo.');
  }

  const { data } = supabase.storage.from(MEMORY_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
