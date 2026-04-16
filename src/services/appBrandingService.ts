import { supabase } from '../lib/supabase';

const BRANDING_BUCKET = 'choir-memories';

type BrandingImageKind = 'background' | 'logo';

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

export async function uploadBrandingImage(fileUri: string, kind: BrandingImageKind) {
  const safeExt = getImageExtFromUri(fileUri);
  const fileName = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const filePath = `branding/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(filePath, blob, { contentType: getImageContentType(safeExt), upsert: false });

  if (error) {
    throw toError(error, 'Unable to upload branding image.');
  }

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
