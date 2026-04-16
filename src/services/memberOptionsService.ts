import {
  CHOIR_MEMBER_CATEGORY_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
} from '../constants/categories';
import { supabase } from '../lib/supabase';
import { CategoryOption, MemberOptionRecord, MemberOptionType } from '../types';

const MEMBER_OPTIONS_CACHE_KEY = 'member_options_fallback_v1';

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isMissingMemberOptionsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? error ?? '');
  return /could not find the table 'public\.member_options'|schema cache|relation .*member_options.* does not exist/i.test(message);
}

type MemberOptionCache = Record<MemberOptionType, MemberOptionRecord[]>;

function createDefaultCache(): MemberOptionCache {
  const now = new Date().toISOString();

  const toRecords = (type: MemberOptionType, options: CategoryOption[]): MemberOptionRecord[] =>
    options.map((item, index) => ({
      id: `${type}:${item.value}`,
      option_type: type,
      value: item.value,
      label: item.label,
      sort_order: (index + 1) * 10,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

  return {
    member_category: toRecords('member_category', CHOIR_MEMBER_CATEGORY_OPTIONS.map((item) => ({ label: item.label, value: item.value }))),
    education_status: toRecords('education_status', EDUCATION_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))),
    occupation: toRecords('occupation', OCCUPATION_OPTIONS.map((item) => ({ label: item, value: item }))),
    marital_status: toRecords('marital_status', MARITAL_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }))),
  };
}

async function readMemberCache(): Promise<MemberOptionCache> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', MEMBER_OPTIONS_CACHE_KEY).maybeSingle();

  const raw = data?.value as Partial<MemberOptionCache> | null | undefined;
  const fallback = createDefaultCache();

  return {
    member_category:
      Array.isArray(raw?.member_category) && raw.member_category.length > 0 ? (raw.member_category as MemberOptionRecord[]) : fallback.member_category,
    education_status:
      Array.isArray(raw?.education_status) && raw.education_status.length > 0 ? (raw.education_status as MemberOptionRecord[]) : fallback.education_status,
    occupation: Array.isArray(raw?.occupation) && raw.occupation.length > 0 ? (raw.occupation as MemberOptionRecord[]) : fallback.occupation,
    marital_status:
      Array.isArray(raw?.marital_status) && raw.marital_status.length > 0 ? (raw.marital_status as MemberOptionRecord[]) : fallback.marital_status,
  };
}

async function writeMemberCache(cache: MemberOptionCache) {
  const { error } = await supabase.from('app_settings').upsert(
    {
      key: MEMBER_OPTIONS_CACHE_KEY,
      value: cache,
    },
    { onConflict: 'key' },
  );

  if (error) {
    throw new Error(error.message || 'Failed to save member options fallback.');
  }
}

function getDefaultOptions(type: MemberOptionType): CategoryOption[] {
  if (type === 'member_category') {
    return CHOIR_MEMBER_CATEGORY_OPTIONS.map((item) => ({ label: item.label, value: item.value }));
  }

  if (type === 'education_status') {
    return EDUCATION_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }));
  }

  if (type === 'marital_status') {
    return MARITAL_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value }));
  }

  return OCCUPATION_OPTIONS.map((item) => ({ label: item, value: item }));
}

function dedupeByValue(options: CategoryOption[]) {
  const seen = new Set<string>();
  const result: CategoryOption[] = [];

  for (const item of options) {
    if (seen.has(item.value)) {
      continue;
    }

    seen.add(item.value);
    result.push(item);
  }

  return result;
}

export async function fetchMemberOptions(type: MemberOptionType): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from('member_options')
    .select('label,value,sort_order')
    .eq('option_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data) {
    if (!error || isMissingMemberOptionsTableError(error)) {
      const cache = await readMemberCache();
      return cache[type]
        .filter((item) => item.is_active !== false)
        .map((item) => ({ label: item.label, value: item.value }));
    }

    return getDefaultOptions(type);
  }

  const databaseOptions = (data as Array<Pick<MemberOptionRecord, 'label' | 'value'>>).map((item) => ({
    label: item.label,
    value: item.value,
  }));

  return dedupeByValue([...databaseOptions, ...getDefaultOptions(type)]);
}

export async function fetchMemberOptionRecords(type: MemberOptionType): Promise<MemberOptionRecord[]> {
  const { data, error } = await supabase
    .from('member_options')
    .select('*')
    .eq('option_type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data) {
    if (error && isMissingMemberOptionsTableError(error)) {
      const cache = await readMemberCache();
      return cache[type].filter((item) => item.is_active !== false);
    }

    return [];
  }

  return data as MemberOptionRecord[];
}

export async function addMemberOption(type: MemberOptionType, label: string, value?: string) {
  const normalizedLabel = normalize(label);
  const normalizedValue = normalize(value ?? normalizedLabel);

  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Label and value are required.');
  }

  const { data: latestRows, error: selectError } = await supabase
    .from('member_options')
    .select('sort_order')
    .eq('option_type', type)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (selectError && isMissingMemberOptionsTableError(selectError)) {
    const cache = await readMemberCache();
    const nextSortOrder = (cache[type].reduce((max, item) => Math.max(max, item.sort_order ?? 0), 0) ?? 0) + 1;
    const nextRecord: MemberOptionRecord = {
      id: `${type}:${normalizedValue}`,
      option_type: type,
      value: normalizedValue,
      label: normalizedLabel,
      sort_order: nextSortOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextCache: MemberOptionCache = {
      ...cache,
      [type]: [...cache[type].filter((item) => item.value !== normalizedValue), nextRecord].sort(
        (left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label, 'am-ET'),
      ),
    };

    await writeMemberCache(nextCache);
    return;
  }

  if (selectError) {
    throw new Error(selectError.message || 'Failed to save member option.');
  }

  const nextSortOrder = ((latestRows?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const { error: upsertError } = await supabase.from('member_options').upsert(
    {
      option_type: type,
      label: normalizedLabel,
      value: normalizedValue,
      sort_order: nextSortOrder,
      is_active: true,
    },
    { onConflict: 'option_type,value' },
  );

  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to save member option.');
  }
}

export async function updateMemberOption(id: string, label: string, value: string) {
  const normalizedLabel = normalize(label);
  const normalizedValue = normalize(value);

  if (!normalizedLabel || !normalizedValue) {
    throw new Error('Label and value are required.');
  }

  const { error } = await supabase
    .from('member_options')
    .update({ label: normalizedLabel, value: normalizedValue })
    .eq('id', id);

  if (error && isMissingMemberOptionsTableError(error)) {
    const cache = await readMemberCache();
    const nextCache: MemberOptionCache = {
      member_category: cache.member_category.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
      education_status: cache.education_status.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
      occupation: cache.occupation.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
      marital_status: cache.marital_status.map((item) =>
        item.id === id ? { ...item, label: normalizedLabel, value: normalizedValue, updated_at: new Date().toISOString() } : item,
      ),
    };
    await writeMemberCache(nextCache);
    return;
  }

  if (error) {
    throw new Error(error.message || 'Failed to update member option.');
  }
}

export async function deactivateMemberOption(id: string) {
  const { error } = await supabase
    .from('member_options')
    .update({ is_active: false })
    .eq('id', id);

  if (error && isMissingMemberOptionsTableError(error)) {
    const cache = await readMemberCache();
    const nextCache: MemberOptionCache = {
      member_category: cache.member_category.filter((item) => item.id !== id),
      education_status: cache.education_status.filter((item) => item.id !== id),
      occupation: cache.occupation.filter((item) => item.id !== id),
      marital_status: cache.marital_status.filter((item) => item.id !== id),
    };
    await writeMemberCache(nextCache);
    return;
  }

  if (error) {
    throw new Error(error.message || 'Failed to delete member option.');
  }
}
