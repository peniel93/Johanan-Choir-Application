import { RHYTHM_OPTIONS, SCALE_OPTIONS } from '../constants/categories';
import { supabase } from '../lib/supabase';
import { CategoryOption, MusicCategoryRecord, MusicCategoryType } from '../types';

const MUSIC_CATEGORIES_CACHE_KEY = 'music_categories_fallback_v1';

function getDefaultOptions(type: MusicCategoryType): CategoryOption[] {
  const source = type === 'scale' ? SCALE_OPTIONS : RHYTHM_OPTIONS;
  return source.filter((item) => item.value !== 'ALL').map((item) => ({ label: item.label, value: item.value }));
}

function dedupeByValue(options: CategoryOption[]) {
  const seen = new Set<string>();
  const result: CategoryOption[] = [];

  for (const option of options) {
    if (seen.has(option.value)) {
      continue;
    }

    seen.add(option.value);
    result.push(option);
  }

  return result;
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isMissingMusicCategoriesTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? error ?? '');
  return /could not find the table 'public\.music_categories'|schema cache|relation .*music_categories.* does not exist/i.test(message);
}

type MusicCategoryCache = Record<MusicCategoryType, MusicCategoryRecord[]>;

function createDefaultCache(): MusicCategoryCache {
  const now = new Date().toISOString();

  const toRecords = (type: MusicCategoryType): MusicCategoryRecord[] =>
    getDefaultOptions(type).map((item, index) => ({
      id: `${type}:${item.value}`,
      category_type: type,
      value: item.value,
      label: item.label,
      sort_order: (index + 1) * 10,
      created_at: now,
      updated_at: now,
    }));

  return {
    scale: toRecords('scale'),
    rhythm: toRecords('rhythm'),
  };
}

async function readMusicCache(): Promise<MusicCategoryCache> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', MUSIC_CATEGORIES_CACHE_KEY).maybeSingle();

  const raw = data?.value as Partial<MusicCategoryCache> | null | undefined;
  const fallback = createDefaultCache();

  return {
    scale: Array.isArray(raw?.scale) && raw.scale.length > 0 ? (raw.scale as MusicCategoryRecord[]) : fallback.scale,
    rhythm: Array.isArray(raw?.rhythm) && raw.rhythm.length > 0 ? (raw.rhythm as MusicCategoryRecord[]) : fallback.rhythm,
  };
}

async function writeMusicCache(cache: MusicCategoryCache) {
  const { error } = await supabase.from('app_settings').upsert(
    {
      key: MUSIC_CATEGORIES_CACHE_KEY,
      value: cache,
    },
    { onConflict: 'key' },
  );

  if (error) {
    throw new Error(error.message || 'Failed to save music categories fallback.');
  }
}

function makeFallback(type: MusicCategoryType, includeAll: boolean) {
  const defaults = getDefaultOptions(type);
  return includeAll ? [{ label: type === 'scale' ? 'ሁሉም መዝሙሮች' : 'ሁሉም ሪትሞች', value: 'ALL' }, ...defaults] : defaults;
}

export async function fetchMusicCategoryOptions(type: MusicCategoryType, includeAll = false): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from('music_categories')
    .select('value,label,sort_order')
    .eq('category_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data) {
    if (!error || isMissingMusicCategoriesTableError(error)) {
      const cache = await readMusicCache();
      const cachedOptions = cache[type]
        .filter((item) => item.is_active !== false)
        .map((item) => ({ label: item.label, value: item.value }));

      const mergedFallback = dedupeByValue([...cachedOptions, ...getDefaultOptions(type)]);
      return includeAll
        ? [{ label: type === 'scale' ? 'ሁሉም መዝሙሮች' : 'ሁሉም ሪትሞች', value: 'ALL' }, ...mergedFallback]
        : mergedFallback;
    }

    return makeFallback(type, includeAll);
  }

  const databaseOptions = (data as Array<Pick<MusicCategoryRecord, 'value' | 'label' | 'sort_order'>>).map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const merged = dedupeByValue([...databaseOptions, ...getDefaultOptions(type)]);
  return includeAll ? [{ label: type === 'scale' ? 'ሁሉም መዝሙሮች' : 'ሁሉም ሪትሞች', value: 'ALL' }, ...merged] : merged;
}

export async function addMusicCategoryOption(type: MusicCategoryType, label: string, value?: string) {
  const normalizedLabel = normalizeLabel(label);
  const normalizedValue = normalizeLabel(value ?? normalizedLabel);

  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Label and value are required.');
  }

  const { data: existingRows, error } = await supabase
    .from('music_categories')
    .select('sort_order')
    .eq('category_type', type)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (error && isMissingMusicCategoriesTableError(error)) {
    const cache = await readMusicCache();
    const nextSortOrder = (cache[type].reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0) ?? 0) + 1;
    const nextRecord: MusicCategoryRecord = {
      id: `${type}:${normalizedValue}`,
      category_type: type,
      value: normalizedValue,
      label: normalizedLabel,
      sort_order: nextSortOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextCache: MusicCategoryCache = {
      ...cache,
      [type]: [...cache[type].filter((item) => item.value !== normalizedValue), nextRecord].sort(
        (left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label, 'am-ET'),
      ),
    };

    await writeMusicCache(nextCache);
    return;
  }

  if (error) {
    throw new Error(error.message || 'Failed to save category option.');
  }

  const nextSortOrder = ((existingRows?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const upsertError = await supabase.from('music_categories').upsert(
    {
      category_type: type,
      value: normalizedValue,
      label: normalizedLabel,
      sort_order: nextSortOrder,
      is_active: true,
    },
    { onConflict: 'category_type,value' },
  );

  if (upsertError.error) {
    throw new Error(upsertError.error.message || 'Failed to save category option.');
  }
}

export async function fetchMusicCategoryRecords(type: MusicCategoryType): Promise<MusicCategoryRecord[]> {
  const { data, error } = await supabase
    .from('music_categories')
    .select('*')
    .eq('category_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data) {
    if (error && isMissingMusicCategoriesTableError(error)) {
      const cache = await readMusicCache();
      return cache[type].filter((item) => item.is_active !== false);
    }

    return [];
  }

  return data as MusicCategoryRecord[];
}

export async function updateMusicCategoryOption(id: string, label: string, value: string) {
  const normalizedLabel = normalizeLabel(label);
  const normalizedValue = normalizeLabel(value);

  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Label and value are required.');
  }

  const { error } = await supabase
    .from('music_categories')
    .update({ label: normalizedLabel, value: normalizedValue })
    .eq('id', id);

  if (error && isMissingMusicCategoriesTableError(error)) {
    const cache = await readMusicCache();
    const nextCache: MusicCategoryCache = {
      scale: cache.scale.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
      rhythm: cache.rhythm.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
    };
    await writeMusicCache(nextCache);
    return;
  }

  if (error) {
    throw new Error(error.message || 'Failed to update category option.');
  }
}

export async function deactivateMusicCategoryOption(id: string) {
  const { error } = await supabase
    .from('music_categories')
    .update({ is_active: false })
    .eq('id', id);

  if (error && isMissingMusicCategoriesTableError(error)) {
    const cache = await readMusicCache();
    const nextCache: MusicCategoryCache = {
      scale: cache.scale.filter((item) => item.id !== id),
      rhythm: cache.rhythm.filter((item) => item.id !== id),
    };
    await writeMusicCache(nextCache);
    return;
  }

  if (error) {
    throw new Error(error.message || 'Failed to delete category option.');
  }
}
