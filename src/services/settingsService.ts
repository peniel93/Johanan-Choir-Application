import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  AppAccessSettings,
  AppBrandingSettings,
  AppLanguage,
  DeveloperProfile,
  PageContentSettings,
  SocialMediaLink,
  TextStyleSettings,
} from '../types';

const PAGE_CONTENT_KEY = 'page_content';
const DEVELOPER_INFO_KEY = 'developer_info';
const APP_ACCESS_KEY = 'app_access';
const PAGE_TEXT_STYLE_KEY = 'page_text_style';
const LYRICS_TEXT_STYLE_KEY = 'lyrics_text_style';
const APP_LANGUAGE_KEY = 'app_language';
const PAGE_CONTENT_EN_KEY = 'page_content_en';
const APP_BRANDING_KEY = 'app_branding';
const SINGLETON_ID = 1;
const PAGE_CONTENT_CACHE_KEY = 'jc_page_content_cache_v1';
const DEVELOPER_INFO_CACHE_KEY = 'jc_developer_info_cache_v1';
const APP_ACCESS_CACHE_KEY = 'jc_app_access_cache_v1';
const PAGE_TEXT_STYLE_CACHE_KEY = 'jc_page_text_style_cache_v1';
const LYRICS_TEXT_STYLE_CACHE_KEY = 'jc_lyrics_text_style_cache_v1';
const APP_LANGUAGE_CACHE_KEY = 'jc_app_language_cache_v1';
const PAGE_CONTENT_EN_CACHE_KEY = 'jc_page_content_en_cache_v1';
const APP_BRANDING_CACHE_KEY = 'jc_app_branding_cache_v1';

export const DEFAULT_PAGE_CONTENT: PageContentSettings = {
  homePanelTitle: 'እንኳን ደህና መጡ',
  homePanelText: 'በዚህ መተግበሪያ የመዝሙር ግጥሞችን በፍጥነት መፈለግ፣ መውደድ እና ተወዳጅ ዝርዝር ውስጥ ማስቀመጥ ይችላሉ።',
  aboutTitle: 'ስለ መተግበሪያው',
  aboutBody: 'ይህ መተግበሪያ የዮሐናን መዘምራን የመዝሙር ግጥሞችን በአማርኛ ለማስቀመጥ፣ ለማየት እና ለማስተዳደር የተሰራ ነው።',
  servicesTitle: 'አገልግሎቶች',
  servicesItems: [
    'የመዝሙር ፍለጋ እና ማጣሪያ',
    'ስኬል/ሪትም መከፋፈል',
    'ተወዳጅ ዝርዝር እና ላይክ',
    'ኦፍላይን ንባብ እና ማዘመን',
    'አድሚን እና ሱፐር አድሚን አስተዳደር',
  ],
  copyrightText: 'Copyright © Johanan Choir. All rights reserved.',
};

export const DEFAULT_PAGE_CONTENT_EN: PageContentSettings = {
  homePanelTitle: 'Welcome',
  homePanelText: 'Use this app to quickly search lyrics, like songs, and keep favorites in one place.',
  aboutTitle: 'About This App',
  aboutBody: 'This app is built for Johanan Choir to store, view, and manage song lyrics.',
  servicesTitle: 'Services',
  servicesItems: [
    'Lyrics search and filtering',
    'Scale and rhythm grouping',
    'Favorites and likes',
    'Offline reading and updates',
    'Admin and super admin management',
  ],
  copyrightText: 'Copyright © Johanan Choir. All rights reserved.',
};

export const DEFAULT_DEVELOPER_INFO: DeveloperProfile = {
  name: 'Peniel Abebe',
  email: 'penielabebe93abebe@gmail.com',
  phone: '',
  bio: 'Choir application developer and maintainer.',
  socialLinks: [],
};

export const DEFAULT_APP_ACCESS_SETTINGS: AppAccessSettings = {
  appPassword: 'john 3:16',
};

export const DEFAULT_APP_BRANDING_SETTINGS: AppBrandingSettings = {
  backgroundImageUrl: '',
  choirLogoUrl: '',
  choirTitle: 'Johanan Choir',
};

export const DEFAULT_PAGE_TEXT_STYLE: TextStyleSettings = {
  fontFamily: 'SYSTEM',
  fontSize: 12,
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
  highlightColor: '#FEF08A',
};

export const DEFAULT_LYRICS_TEXT_STYLE: TextStyleSettings = {
  fontFamily: 'SYSTEM',
  fontSize: 12,
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
  highlightColor: '#FEF08A',
};

function mergePageContent(value: Partial<PageContentSettings> | null | undefined): PageContentSettings {
  const servicesItems = Array.isArray(value?.servicesItems)
    ? value.servicesItems.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : DEFAULT_PAGE_CONTENT.servicesItems;

  return {
    ...DEFAULT_PAGE_CONTENT,
    ...(value ?? {}),
    servicesItems,
  };
}

function mergePageContentWithFallback(
  value: Partial<PageContentSettings> | null | undefined,
  fallback: PageContentSettings,
): PageContentSettings {
  const servicesItems = Array.isArray(value?.servicesItems)
    ? value.servicesItems.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : fallback.servicesItems;

  return {
    ...fallback,
    ...(value ?? {}),
    servicesItems,
  };
}

function mergeDeveloperInfo(value: Partial<DeveloperProfile> | null | undefined): DeveloperProfile {
  const socialLinks = Array.isArray(value?.socialLinks)
    ? value.socialLinks
        .map((item, index) => {
          const entry = item as Partial<SocialMediaLink>;
          const id = typeof entry.id === 'string' && entry.id.trim().length > 0
            ? entry.id.trim()
            : `social-${index}-${Date.now()}`;
          const label = typeof entry.label === 'string' ? entry.label.trim() : '';
          const iconName = typeof entry.iconName === 'string' ? entry.iconName.trim() : '';
          const url = typeof entry.url === 'string' ? entry.url.trim() : '';

          if (!label || !iconName || !url) {
            return null;
          }

          return { id, label, iconName, url };
        })
        .filter((item): item is SocialMediaLink => item !== null)
    : [];

  return {
    ...DEFAULT_DEVELOPER_INFO,
    ...(value ?? {}),
    socialLinks,
  };
}

function mergeAppAccessSettings(value: Partial<AppAccessSettings> | null | undefined): AppAccessSettings {
  return {
    ...DEFAULT_APP_ACCESS_SETTINGS,
    ...(value ?? {}),
  };
}

function mergeAppBrandingSettings(value: Partial<AppBrandingSettings> | null | undefined): AppBrandingSettings {
  return {
    ...DEFAULT_APP_BRANDING_SETTINGS,
    ...(value ?? {}),
    backgroundImageUrl:
      typeof value?.backgroundImageUrl === 'string' ? value.backgroundImageUrl.trim() : DEFAULT_APP_BRANDING_SETTINGS.backgroundImageUrl,
    choirLogoUrl: typeof value?.choirLogoUrl === 'string' ? value.choirLogoUrl.trim() : DEFAULT_APP_BRANDING_SETTINGS.choirLogoUrl,
    choirTitle:
      typeof value?.choirTitle === 'string' && value.choirTitle.trim().length > 0
        ? value.choirTitle.trim()
        : DEFAULT_APP_BRANDING_SETTINGS.choirTitle,
  };
}

function mergeTextStyleSettings(
  value: Partial<TextStyleSettings> | null | undefined,
  fallback: TextStyleSettings,
): TextStyleSettings {
  const merged = {
    ...fallback,
    ...(value ?? {}),
  };

  const normalizedSize = Number.isFinite(merged.fontSize) ? Number(merged.fontSize) : fallback.fontSize;

  return {
    ...merged,
    fontFamily:
      merged.fontFamily === 'SERIF' ||
      merged.fontFamily === 'SANS_SERIF' ||
      merged.fontFamily === 'MONOSPACE'
        ? merged.fontFamily
        : 'SYSTEM',
    fontSize: Math.min(72, Math.max(10, normalizedSize)),
    highlightColor: typeof merged.highlightColor === 'string' && merged.highlightColor.trim().length > 0
      ? merged.highlightColor
      : fallback.highlightColor,
  };
}

function mapSettingsError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');

  if (message.includes("Could not find the table 'public.app_settings'")) {
    return new Error('app_settings table አልተፈጠረም። እባክዎ supabase-schema.sql በSupabase SQL Editor ውስጥ እንደገና Run ያድርጉ።');
  }

  if (message.includes("Could not find the table 'public.app_page_content'")) {
    return new Error('app_page_content table አልተፈጠረም። supabase-schema.sql እንደገና Run ያድርጉ።');
  }

  if (message.includes("Could not find the table 'public.app_developer_info'")) {
    return new Error('app_developer_info table አልተፈጠረም። supabase-schema.sql እንደገና Run ያድርጉ።');
  }

  if (message.includes("Could not find the table 'public.app_security_settings'")) {
    return new Error('app_security_settings table አልተፈጠረም። supabase-schema.sql እንደገና Run ያድርጉ።');
  }

  if (message.includes("Could not find the table 'public.app_branding_settings'")) {
    return new Error('app_branding_settings table አልተፈጠረም። supabase-schema.sql እንደገና Run ያድርጉ።');
  }

  return new Error(message);
}

async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getSettingValue<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw mapSettingsError(error);
  }

  if (!data?.value) {
    return null;
  }

  return data.value as T;
}

async function upsertSettingValue(key: string, value: unknown) {
  const { error } = await supabase.from('app_settings').upsert(
    {
      key,
      value,
    },
    { onConflict: 'key' },
  );

  if (error) {
    throw mapSettingsError(error);
  }
}

async function getLegacyPageContent() {
  const value = await getSettingValue<Partial<PageContentSettings>>(PAGE_CONTENT_KEY);
  return mergePageContent(value);
}

async function getLegacyDeveloperInfo() {
  const value = await getSettingValue<Partial<DeveloperProfile>>(DEVELOPER_INFO_KEY);
  return mergeDeveloperInfo(value);
}

async function getLegacyAppAccessSettings() {
  const value = await getSettingValue<Partial<AppAccessSettings>>(APP_ACCESS_KEY);
  return mergeAppAccessSettings(value);
}

async function getLegacyAppBrandingSettings() {
  const value = await getSettingValue<Partial<AppBrandingSettings>>(APP_BRANDING_KEY);
  return mergeAppBrandingSettings(value);
}

async function getTextStyleFromSettings(
  key: string,
  cacheKey: string,
  fallback: TextStyleSettings,
): Promise<TextStyleSettings> {
  try {
    const value = await getSettingValue<Partial<TextStyleSettings>>(key);
    const merged = mergeTextStyleSettings(value, fallback);
    await writeCache(cacheKey, merged);
    return merged;
  } catch {
    const cached = await readCache<TextStyleSettings>(cacheKey);
    return cached ? mergeTextStyleSettings(cached, fallback) : fallback;
  }
}

async function saveTextStyleToSettings(
  key: string,
  cacheKey: string,
  value: TextStyleSettings,
  fallback: TextStyleSettings,
) {
  const normalized = mergeTextStyleSettings(value, fallback);
  await upsertSettingValue(key, normalized);
  await writeCache(cacheKey, normalized);
}

export async function getPageContentSettings() {
  try {
    const { data, error } = await supabase
      .from('app_page_content')
      .select('home_panel_title,home_panel_text,about_title,about_body,services_title,services_items,copyright_text')
      .eq('id', SINGLETON_ID)
      .maybeSingle();

    if (error) {
      throw mapSettingsError(error);
    }

    if (data) {
      const merged = mergePageContent({
        homePanelTitle: data.home_panel_title,
        homePanelText: data.home_panel_text,
        aboutTitle: data.about_title,
        aboutBody: data.about_body,
        servicesTitle: data.services_title,
        servicesItems: data.services_items,
        copyrightText: data.copyright_text,
      });

      await writeCache(PAGE_CONTENT_CACHE_KEY, merged);
      return merged;
    }

    return DEFAULT_PAGE_CONTENT;
  } catch {
    try {
      const legacy = await getLegacyPageContent();
      await writeCache(PAGE_CONTENT_CACHE_KEY, legacy);
      return legacy;
    } catch {
      const cached = await readCache<PageContentSettings>(PAGE_CONTENT_CACHE_KEY);
      return cached ? mergePageContent(cached) : DEFAULT_PAGE_CONTENT;
    }
  }
}

export async function savePageContentSettings(value: PageContentSettings) {
  const { error } = await supabase.from('app_page_content').upsert(
    {
      id: SINGLETON_ID,
      home_panel_title: value.homePanelTitle,
      home_panel_text: value.homePanelText,
      about_title: value.aboutTitle,
      about_body: value.aboutBody,
      services_title: value.servicesTitle,
      services_items: value.servicesItems,
      copyright_text: value.copyrightText,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw mapSettingsError(error);
  }

  await writeCache(PAGE_CONTENT_CACHE_KEY, value);

  // Keep legacy key updated for backward compatibility.
  await upsertSettingValue(PAGE_CONTENT_KEY, value);
}

export async function getAppLanguageSetting(): Promise<AppLanguage> {
  try {
    const value = await getSettingValue<string>(APP_LANGUAGE_KEY);
    const normalized = value === 'en' ? 'en' : 'am';
    await writeCache(APP_LANGUAGE_CACHE_KEY, normalized);
    return normalized;
  } catch {
    const cached = await readCache<string>(APP_LANGUAGE_CACHE_KEY);
    return cached === 'en' ? 'en' : 'am';
  }
}

export async function saveAppLanguageSetting(language: AppLanguage) {
  await upsertSettingValue(APP_LANGUAGE_KEY, language);
  await writeCache(APP_LANGUAGE_CACHE_KEY, language);
}

export async function getPageContentSettingsByLanguage(language: AppLanguage): Promise<PageContentSettings> {
  if (language === 'am') {
    return getPageContentSettings();
  }

  try {
    const value = await getSettingValue<Partial<PageContentSettings>>(PAGE_CONTENT_EN_KEY);
    const merged = mergePageContentWithFallback(value, DEFAULT_PAGE_CONTENT_EN);
    await writeCache(PAGE_CONTENT_EN_CACHE_KEY, merged);
    return merged;
  } catch {
    const cached = await readCache<PageContentSettings>(PAGE_CONTENT_EN_CACHE_KEY);
    return cached ? mergePageContentWithFallback(cached, DEFAULT_PAGE_CONTENT_EN) : DEFAULT_PAGE_CONTENT_EN;
  }
}

export async function savePageContentSettingsByLanguage(language: AppLanguage, value: PageContentSettings) {
  if (language === 'am') {
    await savePageContentSettings(value);
    return;
  }

  const normalized = mergePageContentWithFallback(value, DEFAULT_PAGE_CONTENT_EN);
  await upsertSettingValue(PAGE_CONTENT_EN_KEY, normalized);
  await writeCache(PAGE_CONTENT_EN_CACHE_KEY, normalized);
}

export async function getDeveloperInfo() {
  try {
    const { data, error } = await supabase
      .from('app_developer_info')
      .select('name,email,phone,bio,social_links')
      .eq('id', SINGLETON_ID)
      .maybeSingle();

    if (error) {
      throw mapSettingsError(error);
    }

    if (data) {
      const merged = mergeDeveloperInfo({
        name: data.name,
        email: data.email,
        phone: data.phone,
        bio: data.bio,
        socialLinks: data.social_links,
      });

      await writeCache(DEVELOPER_INFO_CACHE_KEY, merged);
      return merged;
    }

    return DEFAULT_DEVELOPER_INFO;
  } catch {
    try {
      const legacy = await getLegacyDeveloperInfo();
      await writeCache(DEVELOPER_INFO_CACHE_KEY, legacy);
      return legacy;
    } catch {
      const cached = await readCache<DeveloperProfile>(DEVELOPER_INFO_CACHE_KEY);
      return cached ? mergeDeveloperInfo(cached) : DEFAULT_DEVELOPER_INFO;
    }
  }
}

export async function saveDeveloperInfo(value: DeveloperProfile) {
  const { error } = await supabase.from('app_developer_info').upsert(
    {
      id: SINGLETON_ID,
      name: value.name,
      email: value.email,
      phone: value.phone,
      bio: value.bio,
      social_links: value.socialLinks,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw mapSettingsError(error);
  }

  await writeCache(DEVELOPER_INFO_CACHE_KEY, value);

  await upsertSettingValue(DEVELOPER_INFO_KEY, value);
}

export async function getAppAccessSettings() {
  try {
    const { data, error } = await supabase
      .from('app_security_settings')
      .select('app_password')
      .eq('id', SINGLETON_ID)
      .maybeSingle();

    if (error) {
      throw mapSettingsError(error);
    }

    if (data?.app_password) {
      const merged = mergeAppAccessSettings({ appPassword: data.app_password });
      await writeCache(APP_ACCESS_CACHE_KEY, merged);
      return merged;
    }

    return DEFAULT_APP_ACCESS_SETTINGS;
  } catch {
    try {
      const legacy = await getLegacyAppAccessSettings();
      await writeCache(APP_ACCESS_CACHE_KEY, legacy);
      return legacy;
    } catch {
      const cached = await readCache<AppAccessSettings>(APP_ACCESS_CACHE_KEY);
      return cached ? mergeAppAccessSettings(cached) : DEFAULT_APP_ACCESS_SETTINGS;
    }
  }
}

export async function saveAppAccessSettings(value: AppAccessSettings) {
  const { error } = await supabase.from('app_security_settings').upsert(
    {
      id: SINGLETON_ID,
      app_password: value.appPassword,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw mapSettingsError(error);
  }

  await writeCache(APP_ACCESS_CACHE_KEY, value);

  await upsertSettingValue(APP_ACCESS_KEY, value);
}

export async function getAppBrandingSettings() {
  try {
    const { data, error } = await supabase
      .from('app_branding_settings')
      .select('background_image_url,choir_logo_url,choir_title')
      .eq('id', SINGLETON_ID)
      .maybeSingle();

    if (error) {
      throw mapSettingsError(error);
    }

    if (data) {
      const merged = mergeAppBrandingSettings({
        backgroundImageUrl: data.background_image_url,
        choirLogoUrl: data.choir_logo_url,
        choirTitle: data.choir_title,
      });

      await writeCache(APP_BRANDING_CACHE_KEY, merged);
      return merged;
    }

    return DEFAULT_APP_BRANDING_SETTINGS;
  } catch {
    try {
      const legacy = await getLegacyAppBrandingSettings();
      await writeCache(APP_BRANDING_CACHE_KEY, legacy);
      return legacy;
    } catch {
      const cached = await readCache<AppBrandingSettings>(APP_BRANDING_CACHE_KEY);
      return cached ? mergeAppBrandingSettings(cached) : DEFAULT_APP_BRANDING_SETTINGS;
    }
  }
}

export async function saveAppBrandingSettings(value: AppBrandingSettings) {
  const normalized = mergeAppBrandingSettings(value);
  const { error } = await supabase.from('app_branding_settings').upsert(
    {
      id: SINGLETON_ID,
      background_image_url: normalized.backgroundImageUrl,
      choir_logo_url: normalized.choirLogoUrl,
      choir_title: normalized.choirTitle,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw mapSettingsError(error);
  }

  // Keep legacy key updated for backward compatibility.
  await upsertSettingValue(APP_BRANDING_KEY, normalized);
  await writeCache(APP_BRANDING_CACHE_KEY, normalized);
}

export async function getPageTextStyleSettings() {
  return getTextStyleFromSettings(PAGE_TEXT_STYLE_KEY, PAGE_TEXT_STYLE_CACHE_KEY, DEFAULT_PAGE_TEXT_STYLE);
}

export async function savePageTextStyleSettings(value: TextStyleSettings) {
  await saveTextStyleToSettings(PAGE_TEXT_STYLE_KEY, PAGE_TEXT_STYLE_CACHE_KEY, value, DEFAULT_PAGE_TEXT_STYLE);
}

export async function getLyricsTextStyleSettings() {
  return getTextStyleFromSettings(LYRICS_TEXT_STYLE_KEY, LYRICS_TEXT_STYLE_CACHE_KEY, DEFAULT_LYRICS_TEXT_STYLE);
}

export async function saveLyricsTextStyleSettings(value: TextStyleSettings) {
  await saveTextStyleToSettings(LYRICS_TEXT_STYLE_KEY, LYRICS_TEXT_STYLE_CACHE_KEY, value, DEFAULT_LYRICS_TEXT_STYLE);
}
