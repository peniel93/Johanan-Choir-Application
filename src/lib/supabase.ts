import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key-placeholder';

function isValidSupabaseHttpUrl(value?: string) {
  if (!value) {
    return false;
  }

  return /^https:\/\/.+/i.test(value);
}

function tryBuildUrlFromAnonKey(anonKey?: string) {
  if (!anonKey) {
    return null;
  }

  try {
    const payload = anonKey.split('.')[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { ref?: string };

    if (!decoded.ref) {
      return null;
    }

    return `https://${decoded.ref}.supabase.co`;
  } catch {
    return null;
  }
}

const derivedUrl = tryBuildUrlFromAnonKey(supabaseAnonKey);
const resolvedSupabaseUrl = isValidSupabaseHttpUrl(supabaseUrl)
  ? supabaseUrl
  : derivedUrl ?? fallbackUrl;

if (!isValidSupabaseHttpUrl(supabaseUrl) || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase config is missing/invalid. EXPO_PUBLIC_SUPABASE_URL should be HTTPS. Using derived URL when possible.',
  );
}

export const supabase = createClient(
  resolvedSupabaseUrl,
  supabaseAnonKey ?? fallbackAnonKey,
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  },
);
