export type ScaleCategory = string;

export type AppLanguage = 'am' | 'en';

export type RhythmCategory = string;

export type MusicCategoryType = 'scale' | 'rhythm';

export interface CategoryOption {
  label: string;
  value: string;
}

export interface MusicCategoryRecord {
  id: string;
  category_type: MusicCategoryType;
  value: string;
  label: string;
  sort_order: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SortMode = 'NUMBER' | 'ALPHA' | 'NEWEST' | 'OLDEST';

export interface Lyric {
  id: string;
  title: string;
  content: string;
  number: number | null;
  transpose?: number | null;
  audio_url?: string | null;
  scale: ScaleCategory;
  rhythm: RhythmCategory;
  tags?: string[] | null;
  likes_count: number;
  created_at?: string;
  updated_at?: string;
}

export type AdminRole = 'super_admin' | 'admin' | 'pending_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  permissions: string[];
}

export interface LyricsFilters {
  query: string;
  scale: ScaleCategory;
  rhythm: RhythmCategory;
  sortBy: SortMode;
}

export interface PageContentSettings {
  homePanelTitle: string;
  homePanelText: string;
  aboutTitle: string;
  aboutBody: string;
  servicesTitle: string;
  servicesItems: string[];
  copyrightText: string;
}

export interface DeveloperProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  socialLinks: SocialMediaLink[];
}

export interface SocialMediaLink {
  id: string;
  label: string;
  iconName: string;
  url: string;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  message: string;
  lyricSuggestion: string;
  spellingError: string;
  targetEmail?: string | null;
}

export interface ContactReceiver {
  id: string;
  email: string;
  is_approved: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContactRecipientsInfo {
  recipients: string[];
}

export interface AppAccessSettings {
  appPassword: string;
}

export interface AppBrandingSettings {
  backgroundImageUrl: string;
  choirLogoUrl: string;
  choirTitle: string;
}

export type FontFamilyOption = 'SYSTEM' | 'SERIF' | 'SANS_SERIF' | 'MONOSPACE';

export interface TextStyleSettings {
  fontFamily: FontFamilyOption;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
  highlightColor: string;
}

export interface LyricsAnalytics {
  totalSongs: number;
  byScale: Record<string, number>;
  byRhythm: Record<string, number>;
}

export type ChoirMemberCategory = string;

export type MaritalStatus = string;

export type EducationStatus = string;

export interface ChoirMember {
  id: string;
  full_name: string;
  joined_date: string | null;
  batch_year: number | null;
  photo_url: string | null;
  member_categories: ChoirMemberCategory[];
  member_category?: ChoirMemberCategory;
  address: string | null;
  occupation: string | null;
  marital_status: MaritalStatus;
  education_status: EducationStatus;
  committee_service_start_year: number | null;
  committee_service_end_year: number | null;
  retired_year: number | null;
  current_status_note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChoirMemberInput {
  full_name: string;
  joined_date: string | null;
  batch_year: number | null;
  photo_url: string | null;
  member_categories: ChoirMemberCategory[];
  address: string | null;
  occupation: string | null;
  marital_status: MaritalStatus;
  education_status: EducationStatus;
  committee_service_start_year: number | null;
  committee_service_end_year: number | null;
  retired_year: number | null;
  current_status_note: string | null;
}

export interface ChoirMemoryPhoto {
  id: string;
  title: string | null;
  description: string | null;
  photo_url: string;
  created_at?: string;
  updated_at?: string;
}

export type MediaItemType = 'member' | 'memory';

export interface MediaCollectionEntry {
  key: string;
  itemId: string;
  itemType: MediaItemType;
  title: string;
  subtitle: string | null;
  photoUrl: string;
  savedAt: number;
}

export type MemberOptionType = 'member_category' | 'education_status' | 'occupation' | 'marital_status';

export interface MemberOptionRecord {
  id: string;
  option_type: MemberOptionType;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

