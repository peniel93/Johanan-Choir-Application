import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {
  ADDRESS_SCOPE_OPTIONS,
  CHOIR_MEMBER_CATEGORY_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
  ETHIOPIA_MAJOR_CITY_OPTIONS,
  FONT_FAMILY_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
  PERMISSION_OPTIONS,
  RHYTHM_OPTIONS,
  SCALE_OPTIONS,
  WORLD_COUNTRY_OPTIONS,
} from '../constants/categories';
import { CopyrightFooter } from '../components/CopyrightFooter';
import { SOCIAL_MEDIA_ICON_OPTIONS } from '../constants/socialMedia';
import { useAuth } from '../context/AuthContext';
import { SCROLL_TO_TOP_TRIGGER_OFFSET, ScrollToTopButton } from '../components/ScrollToTopButton';
import { supabase } from '../lib/supabase';
import {
  createChoirMemory,
  deleteChoirMemory,
  fetchChoirMemories,
  updateChoirMemory,
  uploadChoirMemoryPhoto,
} from '../services/choirMemoriesService';
import {
  createChoirMember,
  deleteChoirMember,
  fetchChoirMembers,
  updateChoirMemberPhoto,
  updateChoirMember,
  uploadChoirMemberPhoto,
} from '../services/choirMembersService';
import {
  createLyric,
  deleteLyric,
  fetchLyrics,
  getLyricsAnalytics,
  updateLyric,
  uploadLyricAudio,
} from '../services/lyricsService';
import {
  addContactReceiver,
  deleteContactReceiver,
  fetchContactReceivers,
  updateContactReceiver,
} from '../services/contactReceiversService';
import {
  addMusicCategoryOption,
  deactivateMusicCategoryOption,
  fetchMusicCategoryOptions,
  fetchMusicCategoryRecords,
  updateMusicCategoryOption,
} from '../services/musicCategoriesService';
import {
  addMemberOption,
  deactivateMemberOption,
  fetchMemberOptions,
  fetchMemberOptionRecords,
  updateMemberOption,
} from '../services/memberOptionsService';
import {
  DEFAULT_APP_ACCESS_SETTINGS,
  DEFAULT_APP_BRANDING_SETTINGS,
  DEFAULT_DEVELOPER_INFO,
  DEFAULT_LYRICS_TEXT_STYLE,
  DEFAULT_PAGE_CONTENT,
  DEFAULT_PAGE_CONTENT_EN,
  DEFAULT_PAGE_TEXT_STYLE,
  getAppAccessSettings,
  getAppBrandingSettings,
  getDeveloperInfo,
  getLyricsTextStyleSettings,
  getPageContentSettingsByLanguage,
  getPageTextStyleSettings,
  saveAppAccessSettings,
  saveAppBrandingSettings,
  saveDeveloperInfo,
  saveLyricsTextStyleSettings,
  savePageContentSettingsByLanguage,
  savePageTextStyleSettings,
} from '../services/settingsService';
import { uploadBrandingImage } from '../services/appBrandingService';
import { useAppLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { buildFormattedTextStyle } from '../theme/textStyle';
import {
  AdminRole,
  AppAccessSettings,
  AppBrandingSettings,
  CategoryOption,
  ChoirMember,
  ChoirMemberInput,
  ChoirMemoryPhoto,
  ContactReceiver,
  DeveloperProfile,
  LyricsAnalytics,
  Lyric,
  MemberOptionRecord,
  MemberOptionType,
  MusicCategoryRecord,
  PageContentSettings,
  Profile,
  RhythmCategory,
  ScaleCategory,
  SocialMediaLink,
  TextStyleSettings,
} from '../types';

type Mode = 'create' | 'edit' | 'admins' | 'settings' | 'stats' | 'members';
type SettingsSection = 'content' | 'developer' | 'branding' | 'receivers' | 'password' | 'text-style' | 'music' | 'member-options';
type MembersSection = 'member-form' | 'member-list' | 'memory-form' | 'memory-list';
type MemberOptionsSection = 'member-category' | 'education-status' | 'marital-status' | 'occupation';
type MusicSection = 'scale' | 'rhythm';
type ContentSettingsSection = 'home' | 'about' | 'services' | 'copyright';
type DeveloperSettingsSection = 'profile' | 'social-links';

const MEMBERS_SCROLL_CONTAINER_ID = 'admin-dashboard-members-scroll';
const SETTINGS_SCROLL_CONTAINER_ID = 'admin-dashboard-settings-scroll';

const emptyForm = {
  id: '',
  title: '',
  content: '',
  number: '',
  transpose: '0',
  audio_url: null as string | null,
  scale: 'TEZETA_MAJOR' as ScaleCategory,
  rhythm: 'WALTZ' as RhythmCategory,
};

const emptyMemberForm: ChoirMemberInput = {
  full_name: '',
  joined_date: null,
  batch_year: null,
  photo_url: null,
  member_categories: ['CHOIR_LEADERS'],
  address: null,
  occupation: null,
  marital_status: 'SINGLE',
  education_status: 'OTHER',
  committee_service_start_year: null,
  committee_service_end_year: null,
  retired_year: null,
  current_status_note: null,
};

const MIN_PICKER_YEAR = 1950;
const MAX_PICKER_YEAR = 2300;
const MAX_LYRIC_NUMBER = 5000;
const PICKER_YEAR_OPTIONS = Array.from(
  { length: MAX_PICKER_YEAR - MIN_PICKER_YEAR + 1 },
  (_, index) => MAX_PICKER_YEAR - index,
);
const LYRIC_NUMBER_OPTIONS = Array.from({ length: MAX_LYRIC_NUMBER }, (_, index) => index + 1);
const MIN_TRANSPOSE = -12;
const MAX_TRANSPOSE = 12;
const TRANSPOSE_RANGE_OPTIONS = Array.from({ length: MAX_TRANSPOSE - MIN_TRANSPOSE + 1 }, (_, index) => MIN_TRANSPOSE + index);
const MIN_TEXT_STYLE_FONT_SIZE = 10;
const MAX_TEXT_STYLE_FONT_SIZE = 72;
const ADMIN_PLACEHOLDER_TEXT_COLOR = '#64748B';

const TextInput = forwardRef<RNTextInput, TextInputProps>((props, ref) => (
  <RNTextInput
    {...props}
    ref={ref}
    placeholderTextColor={props.placeholderTextColor ?? ADMIN_PLACEHOLDER_TEXT_COLOR}
  />
));

TextInput.displayName = 'AdminDashboardTextInput';

type MemberYearField =
  | 'batch_year'
  | 'committee_service_start_year'
  | 'committee_service_end_year'
  | 'retired_year';

type AddressScope = 'ABROAD' | 'COUNTRYSIDE';

type OptionEditState = {
  source: 'music' | 'member';
  id: string;
  type: string;
  label: string;
  value: string;
};

type IoniconName = keyof typeof Ionicons.glyphMap;

function resolveIoniconName(iconName: string | null | undefined): IoniconName {
  if (iconName && iconName in Ionicons.glyphMap) {
    return iconName as IoniconName;
  }

  return 'link-outline';
}

function toIsoDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function getUnknownErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? fallback);
  }

  return fallback;
}

export function AdminDashboardScreen() {
  const { language } = useAppLanguage();
  const isEnglish = language === 'en';
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 420 ? 8 : width < 900 ? 12 : 18;
  const contentMaxWidth = width < 900 ? 800 : 1020;

  const { profile, signOut, hasPermission } = useAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('content');
  const [membersSection, setMembersSection] = useState<MembersSection>('member-form');
  const [memberOptionsSection, setMemberOptionsSection] = useState<MemberOptionsSection>('member-category');
  const [musicSection, setMusicSection] = useState<MusicSection>('scale');
  const [contentSettingsSection, setContentSettingsSection] = useState<ContentSettingsSection>('home');
  const [developerSettingsSection, setDeveloperSettingsSection] = useState<DeveloperSettingsSection>('profile');
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [lyricAudioLocalUri, setLyricAudioLocalUri] = useState<string | null>(null);
  const [lyricAudioMeta, setLyricAudioMeta] = useState<{ fileName: string | null; mimeType: string | null }>({
    fileName: null,
    mimeType: null,
  });
  const [lyricAudioPreviewSound, setLyricAudioPreviewSound] = useState<Audio.Sound | null>(null);
  const [lyricAudioPreviewPlaying, setLyricAudioPreviewPlaying] = useState(false);
  const [lyricAudioPreviewBusy, setLyricAudioPreviewBusy] = useState(false);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState<AdminRole>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['lyrics.create', 'lyrics.update']);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<PageContentSettings>(
    isEnglish ? DEFAULT_PAGE_CONTENT_EN : DEFAULT_PAGE_CONTENT,
  );
  const [developerInfo, setDeveloperInfoState] = useState<DeveloperProfile>(DEFAULT_DEVELOPER_INFO);
  const [servicesDraft, setServicesDraft] = useState(DEFAULT_PAGE_CONTENT.servicesItems.join('\n'));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsResetting, setSettingsResetting] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [adminManageMessage, setAdminManageMessage] = useState<string | null>(null);
  const [appAccess, setAppAccess] = useState<AppAccessSettings>(DEFAULT_APP_ACCESS_SETTINGS);
  const [appBranding, setAppBranding] = useState<AppBrandingSettings>(DEFAULT_APP_BRANDING_SETTINGS);
  const [brandingBackgroundLocalUri, setBrandingBackgroundLocalUri] = useState<string | null>(null);
  const [brandingLogoLocalUri, setBrandingLogoLocalUri] = useState<string | null>(null);
  const [pageTextStyle, setPageTextStyle] = useState<TextStyleSettings>(DEFAULT_PAGE_TEXT_STYLE);
  const [lyricsTextStyle, setLyricsTextStyle] = useState<TextStyleSettings>(DEFAULT_LYRICS_TEXT_STYLE);
  const [socialLinkEditingId, setSocialLinkEditingId] = useState<string | null>(null);
  const [socialLinkDraft, setSocialLinkDraft] = useState<SocialMediaLink>({
    id: '',
    label: '',
    iconName: SOCIAL_MEDIA_ICON_OPTIONS[0].iconName,
    url: '',
  });
  const [contactReceivers, setContactReceivers] = useState<ContactReceiver[]>([]);
  const [contactReceiverDraftEmail, setContactReceiverDraftEmail] = useState('');
  const [contactReceiverBusy, setContactReceiverBusy] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [lyricsAnalytics, setLyricsAnalytics] = useState<LyricsAnalytics>({ totalSongs: 0, byScale: {}, byRhythm: {} });
  const [choirMembers, setChoirMembers] = useState<ChoirMember[]>([]);
  const [choirMemories, setChoirMemories] = useState<ChoirMemoryPhoto[]>([]);
  const [memberForm, setMemberForm] = useState<ChoirMemberInput>(emptyMemberForm);
  const [memberEditingId, setMemberEditingId] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [memberPhotoLocalUri, setMemberPhotoLocalUri] = useState<string | null>(null);
  const [memberPhotoReplacingId, setMemberPhotoReplacingId] = useState<string | null>(null);
  const [showJoinedDatePicker, setShowJoinedDatePicker] = useState(false);
  const [joinedDateDraft, setJoinedDateDraft] = useState<{ year: number; month: number; day: number }>(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  });
  const [activeYearField, setActiveYearField] = useState<MemberYearField | null>(null);
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  const [addressScope, setAddressScope] = useState<AddressScope>('COUNTRYSIDE');
  const [showAddressScopeDropdown, setShowAddressScopeDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryDescription, setMemoryDescription] = useState('');
  const [memoryPhotoLocalUri, setMemoryPhotoLocalUri] = useState<string | null>(null);
  const [memoryEditingId, setMemoryEditingId] = useState<string | null>(null);
  const [memoryExistingPhotoUrl, setMemoryExistingPhotoUrl] = useState<string | null>(null);
  const [memorySubmitting, setMemorySubmitting] = useState(false);
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);
  const [showLyricNumberPicker, setShowLyricNumberPicker] = useState(false);
  const [showTransposePicker, setShowTransposePicker] = useState(false);
  const [scaleOptions, setScaleOptions] = useState<CategoryOption[]>(SCALE_OPTIONS);
  const [rhythmOptions, setRhythmOptions] = useState<CategoryOption[]>(RHYTHM_OPTIONS);
  const [newScaleLabel, setNewScaleLabel] = useState('');
  const [newScaleValue, setNewScaleValue] = useState('');
  const [newRhythmLabel, setNewRhythmLabel] = useState('');
  const [newRhythmValue, setNewRhythmValue] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [musicScaleRecords, setMusicScaleRecords] = useState<MusicCategoryRecord[]>([]);
  const [musicRhythmRecords, setMusicRhythmRecords] = useState<MusicCategoryRecord[]>([]);
  const [memberCategoryOptions, setMemberCategoryOptions] = useState<CategoryOption[]>(
    CHOIR_MEMBER_CATEGORY_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  );
  const [educationStatusOptions, setEducationStatusOptions] = useState<CategoryOption[]>(
    EDUCATION_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  );
  const [maritalStatusOptions, setMaritalStatusOptions] = useState<CategoryOption[]>(
    MARITAL_STATUS_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
  );
  const [occupationOptions, setOccupationOptions] = useState<CategoryOption[]>(
    OCCUPATION_OPTIONS.map((item) => ({ label: item, value: item })),
  );
  const [memberCategoryRecords, setMemberCategoryRecords] = useState<MemberOptionRecord[]>([]);
  const [educationStatusRecords, setEducationStatusRecords] = useState<MemberOptionRecord[]>([]);
  const [maritalStatusRecords, setMaritalStatusRecords] = useState<MemberOptionRecord[]>([]);
  const [occupationRecords, setOccupationRecords] = useState<MemberOptionRecord[]>([]);
  const [newMemberCategoryLabel, setNewMemberCategoryLabel] = useState('');
  const [newMemberCategoryValue, setNewMemberCategoryValue] = useState('');
  const [newEducationLabel, setNewEducationLabel] = useState('');
  const [newEducationValue, setNewEducationValue] = useState('');
  const [newMaritalLabel, setNewMaritalLabel] = useState('');
  const [newMaritalValue, setNewMaritalValue] = useState('');
  const [newOccupationLabel, setNewOccupationLabel] = useState('');
  const [newOccupationValue, setNewOccupationValue] = useState('');
  const [memberOptionSaving, setMemberOptionSaving] = useState(false);
  const [memberOptionMessage, setMemberOptionMessage] = useState<string | null>(null);
  const [optionEdit, setOptionEdit] = useState<OptionEditState | null>(null);
  const lyricFormScrollRef = useRef<ScrollView | null>(null);
  const adminsFormScrollRef = useRef<ScrollView | null>(null);
  const statsFormScrollRef = useRef<ScrollView | null>(null);
  const membersFormScrollRef = useRef<ScrollView | null>(null);
  const settingsFormScrollRef = useRef<ScrollView | null>(null);
  const lyricFirstFieldYRef = useRef(0);
  const membersFirstFieldYRef = useRef(0);
  const memoriesFirstFieldYRef = useRef(0);
  const lyricTitleInputRef = useRef<RNTextInput | null>(null);
  const memberNameInputRef = useRef<RNTextInput | null>(null);
  const memoryTitleInputRef = useRef<RNTextInput | null>(null);
  const currentScrollOffsetRef = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setShowScrollTop(false);
  }, [mode]);

  const addressOptions = useMemo(
    () => (addressScope === 'ABROAD' ? WORLD_COUNTRY_OPTIONS : ETHIOPIA_MAJOR_CITY_OPTIONS),
    [addressScope],
  );
  const memberCategoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    memberCategoryOptions.forEach((item) => {
      map.set(item.value, item.label);
    });
    return map;
  }, [memberCategoryOptions]);

  function getMemberCategoryLabelsForDisplay(values: string[]) {
    if (values.length === 0) {
      return '-';
    }
    return values.map((value) => memberCategoryLabelMap.get(value) ?? value).join(', ');
  }

  function incrementLyricNumber() {
    const current = Number(form.number);
    const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
    setForm((p) => ({ ...p, number: next.toString() }));
  }

  function decrementLyricNumber() {
    const current = Number(form.number);
    if (!Number.isFinite(current) || current <= 1) {
      setForm((p) => ({ ...p, number: '1' }));
      return;
    }

    const next = Math.max(current - 1, 1);
    setForm((p) => ({ ...p, number: next.toString() }));
  }

  function formatTransposeValue(value: number) {
    if (value > 0) {
      return `+${value}`;
    }

    return value.toString();
  }

  function clampTranspose(value: number) {
    return Math.max(MIN_TRANSPOSE, Math.min(MAX_TRANSPOSE, value));
  }

  function setTransposeValue(value: number) {
    setForm((prev) => ({ ...prev, transpose: clampTranspose(value).toString() }));
  }

  function incrementTranspose() {
    const current = Number(form.transpose);
    const next = Number.isFinite(current) ? current + 1 : 0;
    setTransposeValue(next);
  }

  function decrementTranspose() {
    const current = Number(form.transpose);
    const next = Number.isFinite(current) ? current - 1 : 0;
    setTransposeValue(next);
  }

  async function reloadLyrics() {
    const data = await fetchLyrics();
    setLyrics(data);
    const analytics = await getLyricsAnalytics();
    setLyricsAnalytics(analytics);
  }

  async function reloadMusicCategories() {
    const [scales, rhythms, scaleRecords, rhythmRecords] = await Promise.all([
      fetchMusicCategoryOptions('scale', true),
      fetchMusicCategoryOptions('rhythm', true),
      fetchMusicCategoryRecords('scale'),
      fetchMusicCategoryRecords('rhythm'),
    ]);
    setScaleOptions(scales);
    setRhythmOptions(rhythms);
    setMusicScaleRecords(scaleRecords);
    setMusicRhythmRecords(rhythmRecords);
  }

  async function reloadMemberOptions() {
    const [categoryOptions, educationOptions, maritalOptions, occupationOptionItems, categoryRecords, educationRecords, maritalRecords, occupationOptionRecords] = await Promise.all([
      fetchMemberOptions('member_category'),
      fetchMemberOptions('education_status'),
      fetchMemberOptions('marital_status'),
      fetchMemberOptions('occupation'),
      fetchMemberOptionRecords('member_category'),
      fetchMemberOptionRecords('education_status'),
      fetchMemberOptionRecords('marital_status'),
      fetchMemberOptionRecords('occupation'),
    ]);

    setMemberCategoryOptions(categoryOptions);
    setEducationStatusOptions(educationOptions);
    setMaritalStatusOptions(maritalOptions);
    setOccupationOptions(occupationOptionItems);
    setMemberCategoryRecords(categoryRecords);
    setEducationStatusRecords(educationRecords);
    setMaritalStatusRecords(maritalRecords);
    setOccupationRecords(occupationOptionRecords);
  }

  async function reloadChoirMembers() {
    const data = await fetchChoirMembers();
    setChoirMembers(data);
  }

  async function reloadChoirMemories() {
    const data = await fetchChoirMemories();
    setChoirMemories(data);
  }

  async function reloadAdmins() {
    const { data } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,permissions')
      .order('full_name');

    setAdmins((data as Profile[]) ?? []);
  }

  async function reloadContactReceivers() {
    try {
      const receivers = await fetchContactReceivers();
      setContactReceivers(receivers);
    } catch {
      setContactReceivers([]);
    }
  }

  async function loadSettings() {
    const [page, developer, access, pageStyle, lyricStyle, branding] = await Promise.all([
      getPageContentSettingsByLanguage(language),
      getDeveloperInfo(),
      getAppAccessSettings(),
      getPageTextStyleSettings(),
      getLyricsTextStyleSettings(),
      getAppBrandingSettings(),
    ]);
    setPageContent(page);
    setDeveloperInfoState(developer);
    setServicesDraft(page.servicesItems.join('\n'));
    setAppAccess(access);
    setAppBranding(branding);
    setBrandingBackgroundLocalUri(null);
    setBrandingLogoLocalUri(null);
    setPageTextStyle(pageStyle);
    setLyricsTextStyle(lyricStyle);
  }

  useEffect(() => {
    reloadLyrics();
    loadSettings();
    reloadChoirMembers();
    reloadChoirMemories();
    reloadMusicCategories();
    reloadMemberOptions();
    if (hasPermission('admins.manage')) {
      reloadAdmins();
    }
    if (profile?.role === 'super_admin') {
      reloadContactReceivers();
    }
  }, [language]);

  useEffect(() => {
    if (mode === 'stats') {
      reloadLyrics();
      reloadMusicCategories();
      reloadChoirMembers();
      reloadChoirMemories();
    }

    if (mode === 'members') {
      reloadChoirMembers();
      reloadChoirMemories();
      reloadMemberOptions();
    }

    if (mode === 'create' || mode === 'edit' || mode === 'settings') {
      reloadMusicCategories();
      reloadMemberOptions();
      if (profile?.role === 'super_admin') {
        reloadContactReceivers();
      }
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (lyricAudioPreviewSound) {
        lyricAudioPreviewSound.unloadAsync().catch(() => {
          // Ignore preview cleanup errors.
        });
      }
    };
  }, [lyricAudioPreviewSound]);

  const isAdminByRole = useMemo(
    () => profile?.role === 'admin' || profile?.role === 'super_admin',
    [profile?.role],
  );
  const isSuperAdmin = useMemo(() => profile?.role === 'super_admin', [profile?.role]);
  const settingsSectionOptions = useMemo<Array<{ key: SettingsSection; label: string }>>(
    () => [
      { key: 'content', label: isEnglish ? 'Page Content' : 'የገጽ ይዘት' },
      { key: 'developer', label: isEnglish ? 'Developer' : 'ዴቨሎፐር' },
      { key: 'branding', label: isEnglish ? 'Branding' : 'ብራንዲንግ' },
      { key: 'receivers', label: isEnglish ? 'Receivers' : 'ተቀባዮች' },
      { key: 'password', label: isEnglish ? 'Password' : 'ፓስወርድ' },
      { key: 'text-style', label: isEnglish ? 'Text Style' : 'የጽሁፍ ቅርጽ' },
      { key: 'music', label: isEnglish ? 'Music Categories' : 'የሙዚቃ ምድቦች' },
      { key: 'member-options', label: isEnglish ? 'Member Options' : 'የአባል አማራጮች' },
    ],
    [isEnglish],
  );
  const membersSectionOptions = useMemo<Array<{ key: MembersSection; label: string }>>(
    () => [
      { key: 'member-form', label: isEnglish ? 'Member Form' : 'የአባል ፎርም' },
      { key: 'member-list', label: isEnglish ? 'Members List' : 'የአባላት ዝርዝር' },
      { key: 'memory-form', label: isEnglish ? 'Memory Form' : 'የአፍታ ፎርም' },
      { key: 'memory-list', label: isEnglish ? 'Memories List' : 'የአፍታ ዝርዝር' },
    ],
    [isEnglish],
  );
  const memberOptionsSectionOptions = useMemo<Array<{ key: MemberOptionsSection; label: string }>>(
    () => [
      { key: 'member-category', label: isEnglish ? 'Categories' : 'የአባል ምድቦች' },
      { key: 'education-status', label: isEnglish ? 'Education' : 'ትምህርት' },
      { key: 'marital-status', label: isEnglish ? 'Marital' : 'ትዳር' },
      { key: 'occupation', label: isEnglish ? 'Occupation' : 'ስራ' },
    ],
    [isEnglish],
  );
  const musicSectionOptions = useMemo<Array<{ key: MusicSection; label: string }>>(
    () => [
      { key: 'scale', label: isEnglish ? 'Scale' : 'ስኬል' },
      { key: 'rhythm', label: isEnglish ? 'Rhythm' : 'ሪትም' },
    ],
    [isEnglish],
  );
  const contentSettingsSectionOptions = useMemo<Array<{ key: ContentSettingsSection; label: string }>>(
    () => [
      { key: 'home', label: isEnglish ? 'Home' : 'ሆም' },
      { key: 'about', label: isEnglish ? 'About' : 'ስለ እኛ' },
      { key: 'services', label: isEnglish ? 'Services' : 'አገልግሎት' },
      { key: 'copyright', label: isEnglish ? 'Copyright' : 'መብት' },
    ],
    [isEnglish],
  );
  const developerSettingsSectionOptions = useMemo<Array<{ key: DeveloperSettingsSection; label: string }>>(
    () => [
      { key: 'profile', label: isEnglish ? 'Profile' : 'መገለጫ' },
      { key: 'social-links', label: isEnglish ? 'Social Links' : 'ማህበራዊ ሊንኮች' },
    ],
    [isEnglish],
  );

  useEffect(() => {
    if (mode === 'settings') {
      setSettingsSection('content');
    }

    if (mode === 'members') {
      setMembersSection('member-form');
    }
  }, [mode]);

  useEffect(() => {
    if (settingsSection === 'member-options') {
      setMemberOptionsSection('member-category');
    }

    if (settingsSection === 'music') {
      setMusicSection('scale');
    }

    if (settingsSection === 'content') {
      setContentSettingsSection('home');
    }

    if (settingsSection === 'developer') {
      setDeveloperSettingsSection('profile');
    }
  }, [settingsSection]);
  const canCreate = useMemo(() => isAdminByRole || hasPermission('lyrics.create'), [hasPermission, isAdminByRole]);
  const canEdit = useMemo(() => isAdminByRole || hasPermission('lyrics.update'), [hasPermission, isAdminByRole]);
  const canDelete = useMemo(() => isAdminByRole || hasPermission('lyrics.delete'), [hasPermission, isAdminByRole]);
  const memberNameCollator = useMemo(
    () =>
      new Intl.Collator(isEnglish ? 'en-US' : 'am-ET', {
        sensitivity: 'base',
        numeric: true,
      }),
    [isEnglish],
  );
  const choirMembersGroupedByCategory = useMemo(() => {
    const categoryOrder = new Map<string, number>();
    memberCategoryOptions.forEach((option, index) => {
      categoryOrder.set(option.value, index);
    });

    const groups = new Map<string, { label: string; members: ChoirMember[]; order: number }>();

    for (const member of choirMembers) {
      const categories = member.member_categories.length > 0 ? member.member_categories : ['UNCATEGORIZED'];
      for (const categoryValue of categories) {
        const label =
          categoryValue === 'UNCATEGORIZED'
            ? isEnglish
              ? 'Uncategorized'
              : 'ያልተመደቡ'
            : memberCategoryLabelMap.get(categoryValue) ?? categoryValue;

        const order =
          categoryValue === 'UNCATEGORIZED'
            ? Number.MAX_SAFE_INTEGER
            : categoryOrder.get(categoryValue) ?? Number.MAX_SAFE_INTEGER - 1;

        const existing = groups.get(categoryValue);
        if (existing) {
          existing.members.push(member);
        } else {
          groups.set(categoryValue, { label, members: [member], order });
        }
      }
    }

    return [...groups.entries()]
      .map(([value, group]) => ({ value, ...group }))
      .sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return memberNameCollator.compare(a.label, b.label);
      })
      .map((group) => ({
        ...group,
        members: [...group.members].sort((a, b) => memberNameCollator.compare(a.full_name.trim(), b.full_name.trim())),
      }));
  }, [choirMembers, isEnglish, memberCategoryLabelMap, memberCategoryOptions, memberNameCollator]);

  async function submitLyric() {
    setSubmitMessage(null);

    if (!form.title || !form.content) {
      setSubmitMessage('ማስጠንቀቂያ: ርዕስ እና ግጥም ያስገቡ።');
      return;
    }

    setSubmitting(true);

    if (lyricAudioPreviewSound) {
      await lyricAudioPreviewSound.unloadAsync().catch(() => {
        // Ignore preview unload failures before saving.
      });
      setLyricAudioPreviewSound(null);
      setLyricAudioPreviewPlaying(false);
    }

    let audioUrl = form.audio_url;

    const audioNeedsUpload = Boolean(
      lyricAudioLocalUri &&
      (!form.audio_url || form.audio_url === lyricAudioLocalUri || /^file:|^content:|^blob:/i.test(form.audio_url))
    );
    if (audioNeedsUpload && lyricAudioLocalUri) {
      try {
        audioUrl = await uploadLyricAudio(lyricAudioLocalUri, {
          fileName: lyricAudioMeta.fileName,
          mimeType: lyricAudioMeta.mimeType,
        });
      } catch (err) {
        const message = getUnknownErrorMessage(err, 'የድምጽ ፋይል መስቀል አልተቻለም።');
        setSubmitMessage(`ስህተት: ${message}`);
        return;
      }
    }

    const payload = {
      title: form.title,
      content: form.content,
      number: form.number ? Number(form.number) : null,
      transpose: Number.isFinite(Number(form.transpose)) ? Number(form.transpose) : 0,
      audio_url: audioUrl,
      scale: form.scale,
      rhythm: form.rhythm,
      tags: null,
    };

    try {
      if (mode === 'edit') {
        if (!canEdit) {
          setSubmitMessage('ፍቃድ የለም።');
          return;
        }

        if (!form.id) {
          setSubmitMessage('ማስጠንቀቂያ: ለማስተካከል መጀመሪያ ከዝርዝሩ መዝሙር ይምረጡ።');
          return;
        }

        await updateLyric(form.id, payload);
      } else {
        if (!canCreate) {
          setSubmitMessage('ፍቃድ የለም።');
          return;
        }

        await createLyric(payload);
      }

      setForm(emptyForm);
      setLyricAudioLocalUri(null);
      setLyricAudioMeta({ fileName: null, mimeType: null });
      setLyricAudioPreviewPlaying(false);
      await reloadLyrics();
      setSubmitMessage('ተሳክቷል: መረጃው ተዘምኗል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'በመዝገብ ላይ ማስቀመጥ አልተቻለም።');
      setSubmitMessage(`ስህተት: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToEditableSection(target: 'lyrics' | 'members' | 'memories') {
    if (target === 'members') {
      setMembersSection('member-form');
    } else if (target === 'memories') {
      setMembersSection('memory-form');
    }

    const ref = target === 'lyrics' ? lyricFormScrollRef : membersFormScrollRef;
    const anchorY =
      target === 'lyrics'
        ? lyricFirstFieldYRef.current
        : target === 'members'
          ? membersFirstFieldYRef.current
          : memoriesFirstFieldYRef.current;
    const destinationY = Math.max(anchorY - 8, 0);

    setTimeout(() => {
      ref.current?.scrollTo({ y: destinationY, animated: true });
    }, 80);

    setTimeout(() => {
      if (target === 'lyrics') {
        lyricTitleInputRef.current?.focus();
      } else if (target === 'members') {
        memberNameInputRef.current?.focus();
      } else {
        memoryTitleInputRef.current?.focus();
      }
    }, 220);
  }

  async function onDelete(id: string) {
    if (!canDelete) {
      Alert.alert('ፍቃድ የለም');
      return;
    }

    try {
      await deleteLyric(id);
      await reloadLyrics();
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'ማጥፋት አልተቻለም።');
      Alert.alert('ስህተት', message);
    }
  }

  async function promoteAdmin() {
    setAdminManageMessage(null);

    if (!(isAdminByRole || hasPermission('admins.manage'))) {
      setAdminManageMessage('ፍቃድ የለም።');
      return;
    }

    if (!promoteEmail.trim()) {
      setAdminManageMessage('ኢሜይል ያስገቡ።');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: promoteRole, permissions: selectedPermissions })
      .eq('email', promoteEmail.trim().toLowerCase());

    if (error) {
      setAdminManageMessage(`ስህተት: ${error.message}`);
      return;
    }

    setPromoteEmail('');
    await reloadAdmins();
    setAdminManageMessage('ተሳክቷል: አድሚን ፍቃድ ተዘምኗል።');
  }

  async function saveSettings() {
    if (!(isAdminByRole || hasPermission('admins.manage') || hasPermission('lyrics.update'))) {
      setSettingsMessage('ፍቃድ የለም።');
      return;
    }

    setSettingsSaving(true);
    setSettingsMessage(null);

    const parsedServices = servicesDraft
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const normalizedContent: PageContentSettings = {
      ...pageContent,
      servicesItems: parsedServices.length > 0 ? parsedServices : DEFAULT_PAGE_CONTENT.servicesItems,
    };

    const normalizedPassword = appAccess.appPassword.trim();
    if (normalizedPassword.length < 6 || normalizedPassword.length > 12) {
      setSettingsMessage('የመተግበሪያ የይለፍ ቃል 6 እስከ 12 ቁምፊ መሆን አለበት።');
      setSettingsSaving(false);
      return;
    }

    const normalizedAccess: AppAccessSettings = {
      appPassword: normalizedPassword,
    };

    try {
      let backgroundImageUrl = appBranding.backgroundImageUrl;
      let choirLogoUrl = appBranding.choirLogoUrl;

      if (brandingBackgroundLocalUri) {
        backgroundImageUrl = await uploadBrandingImage(brandingBackgroundLocalUri, 'background');
      }

      if (brandingLogoLocalUri) {
        choirLogoUrl = await uploadBrandingImage(brandingLogoLocalUri, 'logo');
      }

      const normalizedBranding: AppBrandingSettings = {
        backgroundImageUrl,
        choirLogoUrl,
        choirTitle: appBranding.choirTitle.trim().length > 0 ? appBranding.choirTitle.trim() : 'Johanan Choir',
      };

      await Promise.all([
        savePageContentSettingsByLanguage(language, normalizedContent),
        saveDeveloperInfo(developerInfo),
        saveAppAccessSettings(normalizedAccess),
        saveAppBrandingSettings(normalizedBranding),
        savePageTextStyleSettings(pageTextStyle),
        saveLyricsTextStyleSettings(lyricsTextStyle),
      ]);

      setPageContent(normalizedContent);
      setServicesDraft(normalizedContent.servicesItems.join('\n'));
      setAppAccess(normalizedAccess);
      setAppBranding(normalizedBranding);
      setBrandingBackgroundLocalUri(null);
      setBrandingLogoLocalUri(null);
      setSettingsMessage('ተሳክቷል: የገጽ መረጃ ተዘምኗል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'ሴቲንግ ማስቀመጥ አልተቻለም።');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setSettingsSaving(false);
    }
  }

  async function restoreSettingsFromDatabase() {
    if (settingsSaving || settingsResetting) {
      return;
    }

    setSettingsResetting(true);
    setSettingsMessage(null);

    try {
      await loadSettings();
      clearSocialLinkDraft();
      setContactReceiverDraftEmail('');
      setShowAppPassword(false);

      if (profile?.role === 'super_admin') {
        await reloadContactReceivers();
      }

      setSettingsMessage(
        isEnglish
          ? 'Restored: settings were reloaded from the database.'
          : 'ተመልሷል: ሴቲንግ ከዳታቤዝ እንደነበረ ተመልሷል።',
      );
    } catch (err) {
      const message = getUnknownErrorMessage(err, isEnglish ? 'Could not restore settings from database.' : 'ሴቲንግን ከዳታቤዝ መመለስ አልተቻለም።');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setSettingsResetting(false);
    }
  }

  function cancelSettingsEditing() {
    const defaultContent = isEnglish ? DEFAULT_PAGE_CONTENT_EN : DEFAULT_PAGE_CONTENT;

    setPageContent({
      ...defaultContent,
      servicesItems: [...defaultContent.servicesItems],
    });
    setServicesDraft(defaultContent.servicesItems.join('\n'));
    setDeveloperInfoState({
      ...DEFAULT_DEVELOPER_INFO,
      socialLinks: [...DEFAULT_DEVELOPER_INFO.socialLinks],
    });
    setAppAccess({ ...DEFAULT_APP_ACCESS_SETTINGS });
    setAppBranding({ ...DEFAULT_APP_BRANDING_SETTINGS });
    setBrandingBackgroundLocalUri(null);
    setBrandingLogoLocalUri(null);
    setPageTextStyle({ ...DEFAULT_PAGE_TEXT_STYLE });
    setLyricsTextStyle({ ...DEFAULT_LYRICS_TEXT_STYLE });
    clearSocialLinkDraft();
    setContactReceiverDraftEmail('');
    setShowAppPassword(false);
    setSettingsSection('content');
    setSettingsMessage(
      isEnglish
        ? 'Settings edit canceled. Draft reset to defaults.'
        : 'የሴቲንግ ማስተካከያ ተሰርዟል። ረቂቅ ወደ ነባሪ ተመልሷል።',
    );
    setMode('create');
  }

  function clearSocialLinkDraft() {
    setSocialLinkEditingId(null);
    setSocialLinkDraft({
      id: '',
      label: '',
      iconName: SOCIAL_MEDIA_ICON_OPTIONS[0].iconName,
      url: '',
    });
  }

  function applySocialLinkForEdit(link: SocialMediaLink) {
    setSocialLinkEditingId(link.id);
    setSocialLinkDraft(link);
  }

  function upsertSocialLink() {
    const label = socialLinkDraft.label.trim();
    const url = socialLinkDraft.url.trim();
    const iconName = socialLinkDraft.iconName.trim();

    if (!label || !url || !iconName) {
      setSettingsMessage('ትክክለኛ የማህበራዊ መገናኛ ስም እና ሊንክ ያስገቡ።');
      return;
    }

    const id = socialLinkEditingId ?? socialLinkDraft.id ?? `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextLink: SocialMediaLink = {
      id,
      label,
      iconName,
      url,
    };

    setDeveloperInfoState((prev) => {
      const existing = prev.socialLinks ?? [];

      if (socialLinkEditingId) {
        return {
          ...prev,
          socialLinks: existing.map((item) => (item.id === socialLinkEditingId ? nextLink : item)),
        };
      }

      return {
        ...prev,
        socialLinks: [...existing, nextLink],
      };
    });

    clearSocialLinkDraft();
    setSettingsMessage('ማህበራዊ መገናኛ ተዘጋጅቷል። ከዚያ ሴቲንግ ያስቀምጡ።');
  }

  function deleteSocialLink(id: string) {
    setDeveloperInfoState((prev) => ({
      ...prev,
      socialLinks: (prev.socialLinks ?? []).filter((item) => item.id !== id),
    }));

    if (socialLinkEditingId === id) {
      clearSocialLinkDraft();
    }
  }

  async function addContactReceiverEmail() {
    if (!isSuperAdmin) {
      setSettingsMessage('Only super admin can manage contact receivers.');
      return;
    }

    const email = contactReceiverDraftEmail.trim().toLowerCase();
    if (!email) {
      setSettingsMessage('Receiver email is required.');
      return;
    }

    setContactReceiverBusy(true);
    try {
      await addContactReceiver(email);
      setContactReceiverDraftEmail('');
      await reloadContactReceivers();
      setSettingsMessage('Receiver added. Super admin can now approve and activate it.');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Unable to add receiver email.');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setContactReceiverBusy(false);
    }
  }

  async function toggleContactReceiverApproved(receiver: ContactReceiver) {
    if (!isSuperAdmin) {
      setSettingsMessage('Only super admin can manage contact receivers.');
      return;
    }

    setContactReceiverBusy(true);
    try {
      const nextApproved = !receiver.is_approved;
      await updateContactReceiver(receiver.id, {
        is_approved: nextApproved,
        is_active: nextApproved ? receiver.is_active : false,
      });
      await reloadContactReceivers();
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Unable to update receiver approval.');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setContactReceiverBusy(false);
    }
  }

  async function toggleContactReceiverActive(receiver: ContactReceiver) {
    if (!isSuperAdmin) {
      setSettingsMessage('Only super admin can manage contact receivers.');
      return;
    }

    if (!receiver.is_approved) {
      setSettingsMessage('Approve the receiver first, then set active.');
      return;
    }

    setContactReceiverBusy(true);
    try {
      await updateContactReceiver(receiver.id, {
        is_active: !receiver.is_active,
      });
      await reloadContactReceivers();
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Unable to update active state.');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setContactReceiverBusy(false);
    }
  }

  async function removeContactReceiver(receiver: ContactReceiver) {
    if (!isSuperAdmin) {
      setSettingsMessage('Only super admin can manage contact receivers.');
      return;
    }

    setContactReceiverBusy(true);
    try {
      await deleteContactReceiver(receiver.id);
      await reloadContactReceivers();
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Unable to remove receiver email.');
      setSettingsMessage(`ስህተት: ${message}`);
    } finally {
      setContactReceiverBusy(false);
    }
  }

  async function submitMusicCategory(type: 'scale' | 'rhythm') {
    setCategoryMessage(null);

    if (!(isAdminByRole || hasPermission('admins.manage') || hasPermission('lyrics.update'))) {
      setCategoryMessage('ፍቃድ የለም።');
      return;
    }

    const label = type === 'scale' ? newScaleLabel.trim() : newRhythmLabel.trim();
    const value = type === 'scale' ? newScaleValue.trim() : newRhythmValue.trim();

    if (!label) {
      setCategoryMessage(type === 'scale' ? 'Scale label ያስገቡ።' : 'Rhythm label ያስገቡ።');
      return;
    }

    setCategorySaving(true);

    try {
      await addMusicCategoryOption(type, label, value || undefined);
      await reloadMusicCategories();

      if (type === 'scale') {
        setNewScaleLabel('');
        setNewScaleValue('');
      } else {
        setNewRhythmLabel('');
        setNewRhythmValue('');
      }

      setCategoryMessage(type === 'scale' ? 'Scale ተጨምሯል።' : 'Rhythm ተጨምሯል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Category ማስቀመጥ አልተቻለም።');
      setCategoryMessage(`ስህተት: ${message}`);
    } finally {
      setCategorySaving(false);
    }
  }

  async function addMemberOptionType(type: MemberOptionType) {
    setMemberOptionMessage(null);

    if (!(isAdminByRole || hasPermission('admins.manage') || hasPermission('lyrics.update'))) {
      setMemberOptionMessage('ፍቃድ የለም።');
      return;
    }

    const source = {
      member_category: { label: newMemberCategoryLabel, value: newMemberCategoryValue, title: 'Category' },
      education_status: { label: newEducationLabel, value: newEducationValue, title: 'Education Status' },
      marital_status: { label: newMaritalLabel, value: newMaritalValue, title: 'Marital Status' },
      occupation: { label: newOccupationLabel, value: newOccupationValue, title: 'Occupation' },
    }[type];

    if (!source.label.trim()) {
      setMemberOptionMessage(`${source.title} label ያስገቡ።`);
      return;
    }

    setMemberOptionSaving(true);
    try {
      await addMemberOption(type, source.label.trim(), source.value.trim() || undefined);
      await reloadMemberOptions();

      if (type === 'member_category') {
        setNewMemberCategoryLabel('');
        setNewMemberCategoryValue('');
      } else if (type === 'education_status') {
        setNewEducationLabel('');
        setNewEducationValue('');
      } else if (type === 'marital_status') {
        setNewMaritalLabel('');
        setNewMaritalValue('');
      } else {
        setNewOccupationLabel('');
        setNewOccupationValue('');
      }

      setMemberOptionMessage(`${source.title} ተጨምሯል።`);
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Option ማስቀመጥ አልተቻለም።');
      setMemberOptionMessage(`ስህተት: ${message}`);
    } finally {
      setMemberOptionSaving(false);
    }
  }

  async function saveOptionEdit() {
    if (!optionEdit) {
      return;
    }

    try {
      if (optionEdit.source === 'music') {
        await updateMusicCategoryOption(optionEdit.id, optionEdit.label, optionEdit.value);
        await reloadMusicCategories();
      } else {
        await updateMemberOption(optionEdit.id, optionEdit.label, optionEdit.value);
        await reloadMemberOptions();
      }
      setOptionEdit(null);
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Option update failed.');
      Alert.alert('ስህተት', message);
    }
  }

  async function deleteOption(record: OptionEditState) {
    try {
      if (record.source === 'music') {
        await deactivateMusicCategoryOption(record.id);
        await reloadMusicCategories();
      } else {
        await deactivateMemberOption(record.id);
        await reloadMemberOptions();
      }
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'Option delete failed.');
      Alert.alert('ስህተት', message);
    }
  }

  async function pickMemberPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ፍቃድ', 'ፎቶ ለመምረጥ የፎቶ ቤት ፍቃድ ያስፈልጋል።');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const localUri = result.assets[0].uri;
    setMemberPhotoLocalUri(localUri);
    setMemberForm((prev) => ({ ...prev, photo_url: localUri }));
  }

  async function pickMemoryPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ፍቃድ', 'ፎቶ ለመምረጥ የፎቶ ቤት ፍቃድ ያስፈልጋል።');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setMemoryPhotoLocalUri(result.assets[0].uri);
  }

  async function pickBrandingBackgroundPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ፍቃድ', 'ፎቶ ለመምረጥ የፎቶ ቤት ፍቃድ ያስፈልጋል።');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.92,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const uri = result.assets[0].uri;
    setBrandingBackgroundLocalUri(uri);
    setAppBranding((prev) => ({ ...prev, backgroundImageUrl: uri }));
  }

  async function pickBrandingLogoPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ፍቃድ', 'ፎቶ ለመምረጥ የፎቶ ቤት ፍቃድ ያስፈልጋል።');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.92,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const uri = result.assets[0].uri;
    setBrandingLogoLocalUri(uri);
    setAppBranding((prev) => ({ ...prev, choirLogoUrl: uri }));
  }

  function applyMemoryForEdit(memory: ChoirMemoryPhoto) {
    setMembersSection('memory-form');
    setMemoryEditingId(memory.id);
    setMemoryTitle(memory.title ?? '');
    setMemoryDescription(memory.description ?? '');
    setMemoryExistingPhotoUrl(memory.photo_url);
    setMemoryPhotoLocalUri(memory.photo_url);
    setMemoryMessage(null);
    scrollToEditableSection('memories');
  }

  function clearMemoryForm() {
    setMemoryEditingId(null);
    setMemoryTitle('');
    setMemoryDescription('');
    setMemoryExistingPhotoUrl(null);
    setMemoryPhotoLocalUri(null);
  }

  async function submitMemoryPhoto() {
    setMemoryMessage(null);

    if (!memoryPhotoLocalUri && !memoryExistingPhotoUrl) {
      setMemoryMessage('ፎቶ ይምረጡ።');
      return;
    }

    setMemorySubmitting(true);
    try {
      let photoUrl = memoryExistingPhotoUrl;
      const shouldUploadNewPhoto = Boolean(memoryPhotoLocalUri && memoryPhotoLocalUri !== memoryExistingPhotoUrl);

      if (shouldUploadNewPhoto && memoryPhotoLocalUri) {
        photoUrl = await uploadChoirMemoryPhoto(memoryPhotoLocalUri);
      }

      if (!photoUrl) {
        setMemoryMessage('ፎቶ ይምረጡ።');
        return;
      }

      const payload = {
        title: memoryTitle.trim() || null,
        description: memoryDescription.trim() || null,
        photo_url: photoUrl,
      };

      if (memoryEditingId) {
        await updateChoirMemory(memoryEditingId, payload);
      } else {
        await createChoirMemory(payload);
      }

      await reloadChoirMemories();
      clearMemoryForm();
      setMemoryMessage(memoryEditingId ? 'ተሳክቷል: የልዩ አፍታ ፎቶ ተዘምኗል።' : 'ተሳክቷል: ልዩ የኮየር አፍታ ፎቶ ተጨምሯል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'የልዩ አፍታ ፎቶ መጨመር አልተቻለም።');
      setMemoryMessage(`ስህተት: ${message}`);
    } finally {
      setMemorySubmitting(false);
    }
  }

  async function onDeleteMemory(id: string) {
    try {
      await deleteChoirMemory(id);
      await reloadChoirMemories();
      if (memoryEditingId === id) {
        clearMemoryForm();
      }
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'የልዩ አፍታ ፎቶ ማጥፋት አልተቻለም።');
      Alert.alert('ስህተት', message);
    }
  }

  function getAudioFileName(uri: string) {
    const cleaned = uri.split('?')[0];
    const segments = cleaned.split('/');
    return segments[segments.length - 1] || cleaned;
  }

  async function pickLyricAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const pickedAsset = result.assets[0];
    const localUri = pickedAsset.uri;

    if (lyricAudioPreviewSound) {
      await lyricAudioPreviewSound.unloadAsync().catch(() => {
        // Ignore preview unload failures when replacing audio.
      });
      setLyricAudioPreviewSound(null);
      setLyricAudioPreviewPlaying(false);
    }

    setLyricAudioLocalUri(localUri);
    setLyricAudioMeta({
      fileName: pickedAsset.name ?? null,
      mimeType: pickedAsset.mimeType ?? null,
    });
    setForm((prev) => ({ ...prev, audio_url: localUri }));
  }

  async function testPickedLyricAudio() {
    if (!lyricAudioLocalUri) {
      setSubmitMessage('ማስጠንቀቂያ: መጀመሪያ የድምጽ ፋይል ይምረጡ።');
      return;
    }

    setLyricAudioPreviewBusy(true);
    setSubmitMessage(null);
    try {
      if (lyricAudioPreviewSound) {
        await lyricAudioPreviewSound.unloadAsync().catch(() => {
          // Ignore cleanup failures while retesting.
        });
        setLyricAudioPreviewSound(null);
        setLyricAudioPreviewPlaying(false);
      }

      const created = await Audio.Sound.createAsync(
        { uri: lyricAudioLocalUri },
        { shouldPlay: true },
      );

      created.sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          return;
        }

        setLyricAudioPreviewPlaying(Boolean(status.isPlaying));

        if (status.didJustFinish) {
          created.sound.unloadAsync().catch(() => {
            // Ignore unload failures after preview finish.
          });
          setLyricAudioPreviewSound(null);
          setLyricAudioPreviewPlaying(false);
        }
      });

      setLyricAudioPreviewSound(created.sound);
      setLyricAudioPreviewPlaying(true);
      setSubmitMessage('ተሳክቷል: የተመረጠው ድምጽ ተጫውቷል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'የተመረጠው የድምጽ ፋይል አልተጫወተም።');
      setSubmitMessage(`ስህተት: ${message}`);
    } finally {
      setLyricAudioPreviewBusy(false);
    }
  }

  async function stopPickedLyricAudioPreview() {
    if (!lyricAudioPreviewSound) {
      setLyricAudioPreviewPlaying(false);
      return;
    }

    setLyricAudioPreviewBusy(true);
    try {
      await lyricAudioPreviewSound.unloadAsync();
    } catch {
      // Ignore failures while stopping preview playback.
    } finally {
      setLyricAudioPreviewSound(null);
      setLyricAudioPreviewPlaying(false);
      setLyricAudioPreviewBusy(false);
    }
  }

  function clearLyricAudio() {
    if (lyricAudioPreviewSound) {
      lyricAudioPreviewSound.unloadAsync().catch(() => {
        // Ignore preview unload failures while clearing.
      });
    }
    setLyricAudioPreviewSound(null);
    setLyricAudioPreviewPlaying(false);
    setLyricAudioLocalUri(null);
    setLyricAudioMeta({ fileName: null, mimeType: null });
    setForm((prev) => ({ ...prev, audio_url: null }));
  }

  function resetLyricFormState() {
    if (lyricAudioPreviewSound) {
      lyricAudioPreviewSound.unloadAsync().catch(() => {
        // Ignore cleanup failures while resetting form state.
      });
    }

    setForm(emptyForm);
    setLyricAudioLocalUri(null);
    setLyricAudioMeta({ fileName: null, mimeType: null });
    setLyricAudioPreviewSound(null);
    setLyricAudioPreviewPlaying(false);
    setSubmitMessage(null);
  }

  function switchToCreateMode() {
    resetLyricFormState();
    setMode('create');
  }

  function switchToEditMode() {
    resetLyricFormState();
    setMode('edit');
    setSubmitMessage(isEnglish ? 'Select a song from the list to edit.' : 'ለማስተካከል ከዝርዝሩ መዝሙር ይምረጡ።');
  }

  function cancelLyricEditing() {
    resetLyricFormState();
    setSubmitMessage(isEnglish ? 'Editing canceled.' : 'ማስተካከያ ተሰርዟል።');
  }

  function openJoinedDatePicker() {
    const parsed = parseIsoDate(memberForm.joined_date);
    if (parsed) {
      setJoinedDateDraft(parsed);
    } else {
      const today = new Date();
      setJoinedDateDraft({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      });
    }
    setShowJoinedDatePicker(true);
  }

  function confirmJoinedDatePicker() {
    const picked = new Date(joinedDateDraft.year, joinedDateDraft.month - 1, joinedDateDraft.day);
    setMemberForm((prev) => ({
      ...prev,
      joined_date: toIsoDateOnly(picked),
    }));
    setShowJoinedDatePicker(false);
  }

  function setYearField(field: MemberYearField, value: number | null) {
    setMemberForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function incrementMemberYear(field: MemberYearField) {
    const current = memberForm[field];
    const baseline = current ?? new Date().getFullYear();
    setYearField(field, baseline + 1);
  }

  function decrementMemberYear(field: MemberYearField) {
    const current = memberForm[field];
    const baseline = current ?? new Date().getFullYear();
    setYearField(field, baseline - 1);
  }

  const activeYearOptions = useMemo(() => {
    if (!activeYearField) {
      return PICKER_YEAR_OPTIONS;
    }

    const selectedYear = memberForm[activeYearField];
    if (selectedYear == null) {
      return PICKER_YEAR_OPTIONS;
    }

    if (selectedYear >= MIN_PICKER_YEAR && selectedYear <= MAX_PICKER_YEAR) {
      return PICKER_YEAR_OPTIONS;
    }

    return [selectedYear, ...PICKER_YEAR_OPTIONS].sort((a, b) => b - a);
  }, [activeYearField, memberForm]);

  function applyMemberForEdit(member: ChoirMember) {
    setMembersSection('member-form');
    setMemberEditingId(member.id);
    setMemberPhotoLocalUri(null);
    const citySet = new Set(ETHIOPIA_MAJOR_CITY_OPTIONS);
    setAddressScope(citySet.has(member.address ?? '') ? 'COUNTRYSIDE' : 'ABROAD');
    setMemberForm({
      full_name: member.full_name,
      joined_date: member.joined_date,
      batch_year: member.batch_year,
      photo_url: member.photo_url,
      member_categories: member.member_categories,
      address: member.address,
      occupation: member.occupation,
      marital_status: member.marital_status,
      education_status: member.education_status,
      committee_service_start_year: member.committee_service_start_year,
      committee_service_end_year: member.committee_service_end_year,
      retired_year: member.retired_year,
      current_status_note: member.current_status_note,
    });
    scrollToEditableSection('members');
  }

  function clearMemberForm() {
    setMemberEditingId(null);
    setMemberPhotoLocalUri(null);
    setShowJoinedDatePicker(false);
    setActiveYearField(null);
    setShowOccupationDropdown(false);
    setAddressScope('COUNTRYSIDE');
    setShowAddressScopeDropdown(false);
    setShowAddressDropdown(false);
    setMemberForm(emptyMemberForm);
  }

  async function submitMember() {
    setMemberMessage(null);

    if (!memberForm.full_name.trim()) {
      setMemberMessage('ስም ያስገቡ።');
      return;
    }

    if ((memberForm.member_categories ?? []).length === 0) {
      setMemberMessage('ቢያንስ አንድ የአባል ምድብ ይምረጡ።');
      return;
    }

    setMemberSubmitting(true);

    try {
      let photoUrl = memberForm.photo_url;
      if (memberPhotoLocalUri) {
        photoUrl = await uploadChoirMemberPhoto(memberPhotoLocalUri);
      }

      const payload: ChoirMemberInput = {
        ...memberForm,
        full_name: memberForm.full_name.trim(),
        photo_url: photoUrl,
      };

      if (memberEditingId) {
        await updateChoirMember(memberEditingId, payload);
      } else {
        await createChoirMember(payload);
      }

      await reloadChoirMembers();
      clearMemberForm();
      setMemberMessage('ተሳክቷል: የአባል መረጃ ተዘምኗል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'የአባል መረጃ ማስቀመጥ አልተቻለም።');
      setMemberMessage(`ስህተት: ${message}`);
    } finally {
      setMemberSubmitting(false);
    }
  }

  async function onDeleteMember(id: string) {
    try {
      await deleteChoirMember(id);
      await reloadChoirMembers();
      if (memberEditingId === id) {
        clearMemberForm();
      }
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'አባል ማጥፋት አልተቻለም።');
      Alert.alert('ስህተት', message);
    }
  }

  async function replaceMemberPhotoOnly(member: ChoirMember) {
    if (memberPhotoReplacingId) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ፍቃድ', 'ፎቶ ለመምረጥ የፎቶ ቤት ፍቃድ ያስፈልጋል።');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setMemberMessage(null);
    setMemberPhotoReplacingId(member.id);

    try {
      const localUri = result.assets[0].uri;
      const uploadedPhotoUrl = await uploadChoirMemberPhoto(localUri);
      await updateChoirMemberPhoto(member.id, uploadedPhotoUrl);
      await reloadChoirMembers();

      if (memberEditingId === member.id) {
        setMemberPhotoLocalUri(null);
        setMemberForm((prev) => ({
          ...prev,
          photo_url: uploadedPhotoUrl,
        }));
      }

      setMemberMessage(isEnglish ? 'Success: Member photo updated.' : 'ተሳክቷል: የአባሉ ፎቶ ተዘምኗል።');
    } catch (err) {
      const message = getUnknownErrorMessage(err, 'የአባል ፎቶ ማስተካከል አልተቻለም።');
      setMemberMessage(`ስህተት: ${message}`);
    } finally {
      setMemberPhotoReplacingId(null);
    }
  }

  function scrollDomContainerToTop(containerId: string) {
    if (typeof document === 'undefined') {
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    container.scrollTop = 0;
  }

  function updateSectionScrollState(offsetY: number) {
    currentScrollOffsetRef.current = offsetY;
    setShowScrollTop(offsetY > SCROLL_TO_TOP_TRIGGER_OFFSET);
  }

  function getScrollStartY(
    node: {
      getScrollableNode?: () => {
        scrollTop?: number;
      } | null;
    } | null,
    domContainerId?: string,
  ) {
    if (typeof document !== 'undefined' && domContainerId) {
      const container = document.getElementById(domContainerId);
      if (container && typeof container.scrollTop === 'number') {
        return container.scrollTop;
      }
    }

    const scrollableNode = node?.getScrollableNode?.();
    if (scrollableNode && typeof scrollableNode.scrollTop === 'number') {
      return scrollableNode.scrollTop;
    }

    if (typeof window !== 'undefined' && typeof window.scrollY === 'number' && window.scrollY > 0) {
      return window.scrollY;
    }

    return currentScrollOffsetRef.current;
  }

  function scrollRefToTop(ref: React.RefObject<ScrollView | null>, domContainerId?: string) {
    const node = ref.current as unknown as {
      scrollTo?: ((params: { x?: number; y?: number; animated?: boolean }) => void) | ((y?: number, x?: number, animated?: boolean) => void);
      scrollResponderScrollTo?: (params: { x?: number; y?: number; animated?: boolean }) => void;
      getScrollableNode?: () => {
        scrollTo?: (params: { top?: number; left?: number; behavior?: 'auto' | 'smooth' }) => void;
        scrollTop?: number;
      } | null;
    } | null;

    const scrollToObject = node?.scrollTo as ((params: { x?: number; y?: number; animated?: boolean }) => void) | undefined;
    const scrollToLegacy = node?.scrollTo as ((y?: number, x?: number, animated?: boolean) => void) | undefined;

    const scrollableNode = node?.getScrollableNode?.();
    const startY = getScrollStartY(node, domContainerId);

    const applyScrollPosition = (nextY: number) => {
      try {
        scrollToObject?.({ x: 0, y: nextY, animated: false });
      } catch {
        try {
          scrollToLegacy?.(nextY, 0, false);
        } catch {
          // Ignore fallback invocation failures.
        }
      }

      node?.scrollResponderScrollTo?.({ x: 0, y: nextY, animated: false });

      if (scrollableNode) {
        if (typeof scrollableNode.scrollTo === 'function') {
          scrollableNode.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
        }
        if (typeof scrollableNode.scrollTop === 'number') {
          scrollableNode.scrollTop = nextY;
        }
      }

      if (domContainerId && typeof document !== 'undefined') {
        const container = document.getElementById(domContainerId);
        if (container) {
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
          }
          container.scrollTop = nextY;
        }
      }

      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: nextY, left: 0, behavior: 'auto' });
      }

      updateSectionScrollState(nextY);
    };

    if (startY <= 0) {
      applyScrollPosition(0);
      return;
    }

    const durationMs = 650;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextY = Math.max(0, startY * (1 - eased));

      applyScrollPosition(nextY);

      if (progress < 1) {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(animate);
        } else {
          setTimeout(animate, 16);
        }
      } else {
        applyScrollPosition(0);
        if (domContainerId) {
          scrollDomContainerToTop(domContainerId);
        }
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(animate);
    } else {
      animate();
    }
  }

  function scrollToTopCurrentSection() {
    if (mode === 'create' || mode === 'edit') {
      scrollRefToTop(lyricFormScrollRef);
      return;
    }

    if (mode === 'admins') {
      scrollRefToTop(adminsFormScrollRef);
      return;
    }

    if (mode === 'stats') {
      scrollRefToTop(statsFormScrollRef);
      return;
    }

    if (mode === 'members') {
      scrollRefToTop(membersFormScrollRef, MEMBERS_SCROLL_CONTAINER_ID);
      return;
    }

    scrollRefToTop(settingsFormScrollRef, SETTINGS_SCROLL_CONTAINER_ID);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.headerInner, { maxWidth: contentMaxWidth }]}>
          <View>
            <Text style={styles.headerTitle}>{isEnglish ? 'Admin Dashboard' : 'አድሚን ዳሽቦርድ'}</Text>
            <Text style={styles.headerSub}>{profile?.full_name} ({profile?.role})</Text>
          </View>
          <Pressable onPress={signOut} style={styles.logout}>
            <Text style={styles.logoutText}>{isEnglish ? 'Sign Out' : 'ውጣ'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.modeWrap, { paddingHorizontal: horizontalPadding }]}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
          style={[styles.modeRowScroller, { maxWidth: contentMaxWidth }]}
        >
          <Pressable onPress={switchToCreateMode} style={[styles.modeBtn, mode === 'create' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Add Song' : 'መዝሙር ጨምር'}</Text>
          </Pressable>
          <Pressable onPress={switchToEditMode} style={[styles.modeBtn, mode === 'edit' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Edit Songs' : 'መዝሙር አስተካክል'}</Text>
          </Pressable>
          {hasPermission('admins.manage') ? (
            <Pressable onPress={() => setMode('admins')} style={[styles.modeBtn, mode === 'admins' && styles.modeBtnActive]}>
              <Text style={styles.modeText}>{isEnglish ? 'Manage Admins' : 'አድሚን ሹም'}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setMode('stats')} style={[styles.modeBtn, mode === 'stats' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Analytics' : 'ቁጥራዊ መረጃ'}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('members')} style={[styles.modeBtn, mode === 'members' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Members' : 'አባል ጨምር'}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('settings')} style={[styles.modeBtn, mode === 'settings' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>{isEnglish ? 'Settings' : 'ማስተካከያ'}</Text>
          </Pressable>
        </ScrollView>
      </View>

        {mode === 'create' || mode === 'edit' ? (
        <>
        <ScrollView
          ref={lyricFormScrollRef}
          contentContainerStyle={[styles.formWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => updateSectionScrollState(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.formContent, { maxWidth: contentMaxWidth }]}> 
          <View
            onLayout={(event) => {
              lyricFirstFieldYRef.current = event.nativeEvent.layout.y;
            }}
          />
          <TextInput
            ref={lyricTitleInputRef}
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
            placeholder={isEnglish ? 'Title' : 'ርዕስ'}
            style={styles.input}
          />
          <TextInput
            value={form.content}
            onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
            placeholder={isEnglish ? 'Lyrics content' : 'ግጥም'}
            multiline
            style={[styles.input, styles.textArea]}
          />

          <Text style={styles.label}>{isEnglish ? 'Audio Attachment' : 'የድምጽ አባሪ'}</Text>
          <View style={styles.pickerRow}>
            <Pressable style={[styles.input, styles.pickerButton]} onPress={pickLyricAudio}>
              <Text style={styles.pickerButtonText}>
                {form.audio_url ? getAudioFileName(form.audio_url) : isEnglish ? 'Select audio file' : 'የድምጽ ፋይል ይምረጡ'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.clearPickerButton}
              onPress={() => {
                if (lyricAudioPreviewPlaying) {
                  void stopPickedLyricAudioPreview();
                } else {
                  void testPickedLyricAudio();
                }
              }}
              disabled={!lyricAudioLocalUri || lyricAudioPreviewBusy}
            >
              <Text style={styles.clearPickerButtonText}>
                {lyricAudioPreviewBusy
                  ? '...'
                  : lyricAudioPreviewPlaying
                    ? isEnglish
                      ? 'Stop Test'
                      : 'ሙከራ አቁም'
                    : isEnglish
                      ? 'Test Play'
                      : 'ሙከራ አጫውት'}
              </Text>
            </Pressable>
            <Pressable style={styles.clearPickerButton} onPress={clearLyricAudio}>
              <Text style={styles.clearPickerButtonText}>{isEnglish ? 'Clear' : 'አጥፋ'}</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>{isEnglish ? 'Number' : 'ቁጥር'}</Text>
          <View style={styles.pickerRow}>
            <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setShowLyricNumberPicker(true)}>
              <Text style={styles.pickerButtonText}>{form.number || (isEnglish ? 'Select number' : 'ቁጥር ይምረጡ')}</Text>
            </Pressable>
            <View style={styles.inlineStepButtonsWrap}>
              <Pressable style={styles.inlineStepButton} onPress={decrementLyricNumber}>
                <Ionicons name="remove" size={14} color="#1E3A8A" />
              </Pressable>
              <Pressable style={styles.inlineStepButton} onPress={incrementLyricNumber}>
                <Ionicons name="add" size={14} color="#1E3A8A" />
              </Pressable>
            </View>
            <Pressable style={styles.clearPickerButton} onPress={() => setForm((p) => ({ ...p, number: '' }))}>
              <Text style={styles.clearPickerButtonText}>{isEnglish ? 'Clear' : 'አጥፋ'}</Text>
            </Pressable>
          </View>

          <Modal
            visible={showLyricNumberPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLyricNumberPicker(false)}
          >
            <View style={styles.yearModalBackdrop}>
              <View style={styles.yearModalCard}>
                <Text style={styles.label}>{isEnglish ? 'Select Number' : 'ቁጥር ይምረጡ'}</Text>
                <ScrollView style={styles.yearList}>
                  {LYRIC_NUMBER_OPTIONS.map((value) => {
                    const isActive = Number(form.number) === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.yearItem, isActive && styles.yearItemActive]}
                        onPress={() => {
                          setForm((p) => ({ ...p, number: value.toString() }));
                          setShowLyricNumberPicker(false);
                        }}
                      >
                        <Text style={[styles.yearItemText, isActive && styles.yearItemTextActive]}>{value}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.primaryButton} onPress={() => setShowLyricNumberPicker(false)}>
                  <Text style={styles.primaryButtonText}>{isEnglish ? 'Close' : 'ዝጋ'}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Text style={styles.label}>{isEnglish ? 'Scale' : 'ስኬል'}</Text>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {scaleOptions.filter((s) => s.value !== 'ALL').map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setForm((p) => ({ ...p, scale: item.value }))}
                style={[styles.chip, form.scale === item.value && styles.chipActive]}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.chipText, form.scale === item.value && styles.chipTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>{isEnglish ? 'Rhythm' : 'ሪትም'}</Text>
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, styles.rhythmChips]}>
            {rhythmOptions.filter((r) => r.value !== 'ALL').map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setForm((p) => ({ ...p, rhythm: item.value }))}
                style={[styles.chip, form.rhythm === item.value && styles.chipActive]}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.chipText, form.rhythm === item.value && styles.chipTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>{isEnglish ? 'Transpose (-12 to +12)' : 'Transpose (-12 እስከ +12)'}</Text>
          <View style={styles.pickerRow}>
            <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setShowTransposePicker(true)}>
              <Text style={styles.pickerButtonText}>
                {formatTransposeValue(clampTranspose(Number.isFinite(Number(form.transpose)) ? Number(form.transpose) : 0))}
              </Text>
            </Pressable>
            <View style={styles.inlineStepButtonsWrap}>
              <Pressable style={styles.inlineStepButton} onPress={decrementTranspose}>
                <Ionicons name="remove" size={14} color="#1E3A8A" />
              </Pressable>
              <Pressable style={styles.inlineStepButton} onPress={incrementTranspose}>
                <Ionicons name="add" size={14} color="#1E3A8A" />
              </Pressable>
            </View>
          </View>

          <Modal
            visible={showTransposePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTransposePicker(false)}
          >
            <View style={styles.yearModalBackdrop}>
              <View style={styles.yearModalCard}>
                <Text style={styles.label}>{isEnglish ? 'Select Transpose' : 'Transpose ይምረጡ'}</Text>
                <ScrollView style={styles.yearList}>
                  {TRANSPOSE_RANGE_OPTIONS.map((value) => {
                    const isActive = Number(form.transpose) === value;
                    return (
                      <Pressable
                        key={value}
                        style={[styles.yearItem, isActive && styles.yearItemActive]}
                        onPress={() => {
                          setTransposeValue(value);
                          setShowTransposePicker(false);
                        }}
                      >
                        <Text style={[styles.yearItemText, isActive && styles.yearItemTextActive]}>{formatTransposeValue(value)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.primaryButton} onPress={() => setShowTransposePicker(false)}>
                  <Text style={styles.primaryButtonText}>{isEnglish ? 'Close' : 'ዝጋ'}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Pressable onPress={submitLyric} style={styles.primaryButton} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'edit' ? (isEnglish ? 'Update' : 'አሻሽል') : isEnglish ? 'Save' : 'ለጥፍ'}
              </Text>
            )}
          </Pressable>
          {mode === 'edit' && form.id ? (
            <Pressable onPress={cancelLyricEditing} style={styles.formSecondaryActionButton}>
              <Ionicons name="close-circle-outline" size={15} color="#1E3A8A" />
              <Text style={styles.formSecondaryActionButtonText}>{isEnglish ? 'Cancel Editing' : 'ማስተካከያ ሰርዝ'}</Text>
            </Pressable>
          ) : null}
          {mode === 'edit' ? (
            <Text style={styles.pendingHint}>
              {form.id
                ? `${isEnglish ? 'Editing' : 'በማስተካከል ላይ'}: ${form.title}`
                : isEnglish
                  ? 'Select a song below to edit.'
                  : 'ለማስተካከል ከታች ያለውን መዝሙር ይምረጡ።'}
            </Text>
          ) : null}
          {submitMessage ? <Text style={styles.submitMessage}>{submitMessage}</Text> : null}

          {mode === 'edit' ? (
            <FlatList
              data={lyrics}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() => {
                      setForm({
                        id: item.id,
                        title: item.title,
                        content: item.content,
                        number: item.number?.toString() ?? '',
                        transpose: (item.transpose ?? 0).toString(),
                        audio_url: item.audio_url ?? null,
                        scale: item.scale,
                        rhythm: item.rhythm,
                      });
                      setLyricAudioLocalUri(null);
                      setLyricAudioMeta({ fileName: null, mimeType: null });
                      setLyricAudioPreviewPlaying(false);
                      if (lyricAudioPreviewSound) {
                        lyricAudioPreviewSound.unloadAsync().catch(() => {
                          // Ignore preview unload failures while switching lyrics.
                        });
                        setLyricAudioPreviewSound(null);
                      }
                      scrollToEditableSection('lyrics');
                    }}
                  >
                    <Text style={styles.pickButtonText}>{item.title}</Text>
                  </Pressable>
                  <Pressable style={styles.deleteButton} onPress={() => onDelete(item.id)}>
                    <Text style={styles.deleteButtonText}>አጥፋ</Text>
                  </Pressable>
                </View>
              )}
            />
          ) : null}
          </View>
        </ScrollView>
        <ScrollToTopButton
          visible={showScrollTop}
          onPress={() => lyricFormScrollRef.current?.scrollTo({ y: 0, animated: true })}
        />
        </>
      ) : mode === 'admins' ? (
        <>
        <ScrollView
          ref={adminsFormScrollRef}
          contentContainerStyle={[styles.formWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => updateSectionScrollState(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.formContent, { maxWidth: contentMaxWidth }]}> 
          <Text style={styles.pendingHint}>አድሚን ለመሆን ተጠቃሚው መጀመሪያ በአድሚን ገጽ ተመዝግቦ መግባት አለበት።</Text>
          <Text style={styles.label}>የሚሻሻለው ኢሜይል</Text>
          <TextInput
            value={promoteEmail}
            onChangeText={setPromoteEmail}
            autoCapitalize="none"
            placeholder="admin@example.com"
            style={styles.input}
          />

          <Text style={styles.label}>ሚና</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modeRow}
            style={styles.modeRowScroller}
          >
            <Pressable
              onPress={() => setPromoteRole('admin')}
              style={[styles.modeBtn, promoteRole === 'admin' && styles.modeBtnActive]}
            >
              <Text style={styles.modeText}>Admin</Text>
            </Pressable>
            <Pressable
              onPress={() => setPromoteRole('pending_admin')}
              style={[styles.modeBtn, promoteRole === 'pending_admin' && styles.modeBtnActive]}
            >
              <Text style={styles.modeText}>Pending</Text>
            </Pressable>
            <Pressable
              onPress={() => setPromoteRole('super_admin')}
              style={[styles.modeBtn, promoteRole === 'super_admin' && styles.modeBtnActive]}
            >
              <Text style={styles.modeText}>Super Admin</Text>
            </Pressable>
          </ScrollView>

          <Text style={styles.label}>ፍቃዶች</Text>
          {PERMISSION_OPTIONS.map((option) => {
            const active = selectedPermissions.includes(option.key);
            return (
              <Pressable
                key={option.key}
                style={[styles.permissionItem, active && styles.permissionItemActive]}
                onPress={() => {
                  setSelectedPermissions((prev) =>
                    prev.includes(option.key) ? prev.filter((p) => p !== option.key) : [...prev, option.key],
                  );
                }}
              >
                <Text style={styles.permissionText}>{option.label}</Text>
              </Pressable>
            );
          })}

          <Pressable onPress={promoteAdmin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>ፍቃድ አዘምን</Text>
          </Pressable>
          {adminManageMessage ? <Text style={styles.submitMessage}>{adminManageMessage}</Text> : null}

          {admins.map((admin) => (
            <View key={admin.id} style={styles.adminItem}>
              <Text style={styles.adminName}>{admin.full_name}</Text>
              <Text style={styles.adminMeta}>{admin.email}</Text>
              <Text style={styles.adminMeta}>{admin.role}</Text>
            </View>
          ))}
          </View>
        </ScrollView>
        <ScrollToTopButton
          visible={showScrollTop}
          onPress={() => adminsFormScrollRef.current?.scrollTo({ y: 0, animated: true })}
        />
        </>
      ) : mode === 'stats' ? (
        <>
        <ScrollView
          ref={statsFormScrollRef}
          contentContainerStyle={[styles.formWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => updateSectionScrollState(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.formContent, { maxWidth: contentMaxWidth }]}> 
            <View style={styles.analyticsTotalCard}>
              <Text style={styles.analyticsTotalLabel}>ጠቅላላ መዝሙሮች</Text>
              <Text style={styles.analyticsTotalValue}>{lyricsAnalytics.totalSongs}</Text>
            </View>

            <View style={styles.analyticsTotalCard}>
              <Text style={styles.analyticsTotalLabel}>ጠቅላላ አባላት</Text>
              <Text style={styles.analyticsTotalValue}>{choirMembers.length}</Text>
            </View>

            <View style={styles.analyticsTotalCard}>
              <Text style={styles.analyticsTotalLabel}>ጠቅላላ የልዩ አፍታ ፎቶዎች</Text>
              <Text style={styles.analyticsTotalValue}>{choirMemories.length}</Text>
            </View>

            <Text style={styles.label}>በስኬል ቆጠራ</Text>
            <View style={styles.analyticsGrid}>
              {scaleOptions.filter((item) => item.value !== 'ALL').map((item) => (
                <View key={item.value} style={styles.analyticsMiniCard}>
                  <Text style={styles.analyticsMiniLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.analyticsMiniValue}>{lyricsAnalytics.byScale[item.value] ?? 0}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.label}>በሪትም ቆጠራ</Text>
            <View style={styles.analyticsGrid}>
              {rhythmOptions.filter((item) => item.value !== 'ALL').map((item) => (
                <View key={item.value} style={styles.analyticsMiniCard}>
                  <Text style={styles.analyticsMiniLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.analyticsMiniValue}>{lyricsAnalytics.byRhythm[item.value] ?? 0}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <ScrollToTopButton
          visible={showScrollTop}
          onPress={() => statsFormScrollRef.current?.scrollTo({ y: 0, animated: true })}
        />
        </>
      ) : mode === 'members' ? (
        <>
        <ScrollView
          ref={membersFormScrollRef}
          nativeID={MEMBERS_SCROLL_CONTAINER_ID}
          contentContainerStyle={[styles.formWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => updateSectionScrollState(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.formContent, { maxWidth: contentMaxWidth }]}> 
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {membersSectionOptions.map((option) => {
                const active = membersSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setMembersSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {membersSection === 'member-form' ? (
              <>
            <View
              onLayout={(event) => {
                membersFirstFieldYRef.current = event.nativeEvent.layout.y;
              }}
            />
            <Text style={styles.label}>የአባል ስም</Text>
            <TextInput
              ref={memberNameInputRef}
              value={memberForm.full_name}
              onChangeText={(v) => setMemberForm((prev) => ({ ...prev, full_name: v }))}
              style={styles.input}
              placeholder="Member full name"
            />

            <Text style={styles.label}>Joined Date (YYYY-MM-DD)</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.input, styles.pickerButton]} onPress={openJoinedDatePicker}>
                <Text style={styles.pickerButtonText}>{memberForm.joined_date ?? 'Select date'}</Text>
              </Pressable>
              <Pressable style={styles.clearPickerButton} onPress={() => setMemberForm((prev) => ({ ...prev, joined_date: null }))}>
                <Text style={styles.clearPickerButtonText}>Clear</Text>
              </Pressable>
            </View>

            <Modal visible={showJoinedDatePicker} transparent animationType="fade" onRequestClose={() => setShowJoinedDatePicker(false)}>
              <View style={styles.yearModalBackdrop}>
                <View style={styles.dateModalCard}>
                  <Text style={styles.label}>Select Joined Date</Text>

                  <View style={styles.dateColumnsWrap}>
                    <View style={styles.dateColumn}>
                      <Text style={styles.dateColumnTitle}>Year</Text>
                      <ScrollView style={styles.dateColumnList}>
                        {PICKER_YEAR_OPTIONS.map((year) => {
                          const active = joinedDateDraft.year === year;
                          return (
                            <Pressable
                              key={`date-year-${year}`}
                              style={[styles.yearItem, active && styles.yearItemActive]}
                              onPress={() =>
                                setJoinedDateDraft((prev) => {
                                  const maxDay = new Date(year, prev.month, 0).getDate();
                                  return { ...prev, year, day: Math.min(prev.day, maxDay) };
                                })
                              }
                            >
                              <Text style={[styles.yearItemText, active && styles.yearItemTextActive]}>{year}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.dateColumn}>
                      <Text style={styles.dateColumnTitle}>Month</Text>
                      <ScrollView style={styles.dateColumnList}>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                          const active = joinedDateDraft.month === month;
                          return (
                            <Pressable
                              key={`date-month-${month}`}
                              style={[styles.yearItem, active && styles.yearItemActive]}
                              onPress={() =>
                                setJoinedDateDraft((prev) => {
                                  const maxDay = new Date(prev.year, month, 0).getDate();
                                  return { ...prev, month, day: Math.min(prev.day, maxDay) };
                                })
                              }
                            >
                              <Text style={[styles.yearItemText, active && styles.yearItemTextActive]}>{month}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.dateColumn}>
                      <Text style={styles.dateColumnTitle}>Day</Text>
                      <ScrollView style={styles.dateColumnList}>
                        {Array.from({ length: new Date(joinedDateDraft.year, joinedDateDraft.month, 0).getDate() }, (_, index) => index + 1).map((day) => {
                          const active = joinedDateDraft.day === day;
                          return (
                            <Pressable
                              key={`date-day-${day}`}
                              style={[styles.yearItem, active && styles.yearItemActive]}
                              onPress={() => setJoinedDateDraft((prev) => ({ ...prev, day }))}
                            >
                              <Text style={[styles.yearItemText, active && styles.yearItemTextActive]}>{day}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.dateModalActions}>
                    <Pressable style={[styles.deleteButton, styles.dateModalAction]} onPress={() => setShowJoinedDatePicker(false)}>
                      <Text style={styles.deleteButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[styles.primaryButton, styles.dateModalAction]} onPress={confirmJoinedDatePicker}>
                      <Text style={styles.primaryButtonText}>Use Date</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>

            <Text style={styles.label}>Batch Year</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setActiveYearField('batch_year')}>
                <Text style={styles.pickerButtonText}>{memberForm.batch_year?.toString() ?? 'Select year'}</Text>
              </Pressable>
              <View style={styles.inlineStepButtonsWrap}>
                <Pressable style={styles.inlineStepButton} onPress={() => decrementMemberYear('batch_year')}>
                  <Ionicons name="remove" size={14} color="#1E3A8A" />
                </Pressable>
                <Pressable style={styles.inlineStepButton} onPress={() => incrementMemberYear('batch_year')}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
                </Pressable>
              </View>
              <Pressable style={styles.clearPickerButton} onPress={() => setYearField('batch_year', null)}>
                <Text style={styles.clearPickerButtonText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.pillWrap}>
              {memberCategoryOptions.map((option) => {
                const active = memberForm.member_categories.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setMemberForm((prev) => {
                        const exists = prev.member_categories.includes(option.value);
                        const nextCategories = exists
                          ? prev.member_categories.filter((item) => item !== option.value)
                          : [...prev.member_categories, option.value];

                        return { ...prev, member_categories: nextCategories };
                      })
                    }
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Address</Text>
            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setShowAddressScopeDropdown((prev) => !prev)}
              >
                <Text style={styles.dropdownTriggerText}>
                  {ADDRESS_SCOPE_OPTIONS.find((item) => item.value === addressScope)?.label ?? 'Select scope'}
                </Text>
                <Ionicons
                  name={showAddressScopeDropdown ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#1E3A8A"
                />
              </Pressable>
              {showAddressScopeDropdown ? (
                <View style={styles.dropdownMenu}>
                  {ADDRESS_SCOPE_OPTIONS.map((scope) => {
                    const active = addressScope === scope.value;
                    return (
                      <Pressable
                        key={scope.value}
                        style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                        onPress={() => {
                          setAddressScope(scope.value);
                          setMemberForm((prev) => ({ ...prev, address: null }));
                          setShowAddressScopeDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{scope.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setShowAddressDropdown((prev) => !prev)}
              >
                <Text style={styles.dropdownTriggerText}>{memberForm.address ?? 'Select address'}</Text>
                <Ionicons
                  name={showAddressDropdown ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#1E3A8A"
                />
              </Pressable>
              {showAddressDropdown ? (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {addressOptions.map((option) => {
                      const active = memberForm.address === option;
                      return (
                        <Pressable
                          key={option}
                          style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                          onPress={() => {
                            setMemberForm((prev) => ({ ...prev, address: option }));
                            setShowAddressDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{option}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      style={[styles.dropdownItem, !memberForm.address && styles.dropdownItemActive]}
                      onPress={() => {
                        setMemberForm((prev) => ({ ...prev, address: null }));
                        setShowAddressDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !memberForm.address && styles.dropdownItemTextActive]}>Clear</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Text style={styles.label}>Occupation</Text>
            <View style={styles.dropdownWrap}>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setShowOccupationDropdown((prev) => !prev)}
              >
                <Text style={styles.dropdownTriggerText}>{memberForm.occupation ?? 'Select occupation'}</Text>
                <Ionicons
                  name={showOccupationDropdown ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#1E3A8A"
                />
              </Pressable>

              {showOccupationDropdown ? (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {occupationOptions.map((option) => {
                      const active = memberForm.occupation === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                          onPress={() => {
                            setMemberForm((prev) => ({ ...prev, occupation: option.value }));
                            setShowOccupationDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      style={[styles.dropdownItem, !memberForm.occupation && styles.dropdownItemActive]}
                      onPress={() => {
                        setMemberForm((prev) => ({ ...prev, occupation: null }));
                        setShowOccupationDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, !memberForm.occupation && styles.dropdownItemTextActive]}>Clear</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Text style={styles.label}>Marital Status</Text>
            <View style={styles.pillWrap}>
              {maritalStatusOptions.map((option) => {
                const active = memberForm.marital_status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setMemberForm((prev) => ({ ...prev, marital_status: option.value }))}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Education / Status</Text>
            <View style={styles.pillWrap}>
              {educationStatusOptions.map((option) => {
                const active = memberForm.education_status === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setMemberForm((prev) => ({ ...prev, education_status: option.value }))}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Committee Service Start Year</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setActiveYearField('committee_service_start_year')}>
                <Text style={styles.pickerButtonText}>{memberForm.committee_service_start_year?.toString() ?? 'Select year'}</Text>
              </Pressable>
              <View style={styles.inlineStepButtonsWrap}>
                <Pressable style={styles.inlineStepButton} onPress={() => decrementMemberYear('committee_service_start_year')}>
                  <Ionicons name="remove" size={14} color="#1E3A8A" />
                </Pressable>
                <Pressable style={styles.inlineStepButton} onPress={() => incrementMemberYear('committee_service_start_year')}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
                </Pressable>
              </View>
              <Pressable style={styles.clearPickerButton} onPress={() => setYearField('committee_service_start_year', null)}>
                <Text style={styles.clearPickerButtonText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Committee Service End Year</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setActiveYearField('committee_service_end_year')}>
                <Text style={styles.pickerButtonText}>{memberForm.committee_service_end_year?.toString() ?? 'Select year'}</Text>
              </Pressable>
              <View style={styles.inlineStepButtonsWrap}>
                <Pressable style={styles.inlineStepButton} onPress={() => decrementMemberYear('committee_service_end_year')}>
                  <Ionicons name="remove" size={14} color="#1E3A8A" />
                </Pressable>
                <Pressable style={styles.inlineStepButton} onPress={() => incrementMemberYear('committee_service_end_year')}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
                </Pressable>
              </View>
              <Pressable style={styles.clearPickerButton} onPress={() => setYearField('committee_service_end_year', null)}>
                <Text style={styles.clearPickerButtonText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Retired Year</Text>
            <View style={styles.pickerRow}>
              <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setActiveYearField('retired_year')}>
                <Text style={styles.pickerButtonText}>{memberForm.retired_year?.toString() ?? 'Select year'}</Text>
              </Pressable>
              <View style={styles.inlineStepButtonsWrap}>
                <Pressable style={styles.inlineStepButton} onPress={() => decrementMemberYear('retired_year')}>
                  <Ionicons name="remove" size={14} color="#1E3A8A" />
                </Pressable>
                <Pressable style={styles.inlineStepButton} onPress={() => incrementMemberYear('retired_year')}>
                  <Ionicons name="add" size={14} color="#1E3A8A" />
                </Pressable>
              </View>
              <Pressable style={styles.clearPickerButton} onPress={() => setYearField('retired_year', null)}>
                <Text style={styles.clearPickerButtonText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Current Status Note</Text>
            <TextInput
              value={memberForm.current_status_note ?? ''}
              onChangeText={(v) => setMemberForm((prev) => ({ ...prev, current_status_note: v || null }))}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="Married, lives abroad, etc"
            />

            <Pressable style={styles.secondaryUploadButton} onPress={pickMemberPhoto}>
              <Text style={styles.secondaryUploadButtonText}>Photo Attach</Text>
            </Pressable>
            {memberForm.photo_url ? <Image source={{ uri: memberForm.photo_url as string }} style={styles.memberPreviewImage} /> : null}

            <View style={styles.memberActionRow}>
              <Pressable onPress={submitMember} style={[styles.primaryButton, styles.memberActionButton]} disabled={memberSubmitting}>
                {memberSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>{memberEditingId ? 'አባል አዘምን' : 'አባል ጨምር'}</Text>
                )}
              </Pressable>
              {memberEditingId ? (
                <Pressable onPress={clearMemberForm} style={[styles.deleteButton, styles.memberActionButtonSecondary]}>
                  <Text style={styles.deleteButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {memberMessage ? <Text style={styles.submitMessage}>{memberMessage}</Text> : null}

            </>
            ) : null}

            {membersSection === 'member-list' ? (
              <>
            {choirMembersGroupedByCategory.map((group) => (
              <View key={group.value} style={styles.memberCategorySection}>
                <Text style={styles.memberCategorySectionTitle}>
                  {group.label} ({group.members.length})
                </Text>
                {group.members.map((member) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberCardTop}>
                      {member.photo_url ? <Image source={{ uri: member.photo_url }} style={styles.memberThumb} /> : null}
                      <View style={styles.memberCardInfo}>
                        <Text style={styles.adminName}>{member.full_name}</Text>
                        <Text style={styles.adminMeta}>{getMemberCategoryLabelsForDisplay(member.member_categories)}</Text>
                        <Text style={styles.adminMeta}>Batch: {member.batch_year ?? '-'}</Text>
                      </View>
                    </View>
                    <View style={styles.memberCardActions}>
                      <Pressable style={styles.pickButton} onPress={() => applyMemberForEdit(member)}>
                        <Text style={styles.pickButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.pickButton, memberPhotoReplacingId === member.id && styles.disabledButton]}
                        onPress={() => {
                          void replaceMemberPhotoOnly(member);
                        }}
                        disabled={Boolean(memberPhotoReplacingId)}
                      >
                        <Text style={styles.pickButtonText}>
                          {memberPhotoReplacingId === member.id ? '...' : isEnglish ? 'Replace Photo' : 'ፎቶ ቀይር'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.deleteButton} onPress={() => onDeleteMember(member.id)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            </>
            ) : null}

            {membersSection === 'memory-form' ? (
              <>
            <View
              onLayout={(event) => {
                memoriesFirstFieldYRef.current = event.nativeEvent.layout.y;
              }}
            />
            <Text style={styles.label}>Memorable & Special Choir Moments</Text>
            <TextInput
              ref={memoryTitleInputRef}
              value={memoryTitle}
              onChangeText={setMemoryTitle}
              style={styles.input}
              placeholder="Moment title (optional)"
            />
            <TextInput
              value={memoryDescription}
              onChangeText={setMemoryDescription}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="Description (optional)"
            />
            {memoryEditingId ? <Text style={styles.pendingHint}>Editing selected memory photo. Attach a new photo to replace current one.</Text> : null}
            <Pressable style={styles.secondaryUploadButton} onPress={pickMemoryPhoto}>
              <Text style={styles.secondaryUploadButtonText}>{memoryEditingId ? 'Replace Moment Photo' : 'Attach Moment Photo'}</Text>
            </Pressable>
            {memoryPhotoLocalUri ? <Image source={{ uri: memoryPhotoLocalUri }} style={styles.memberPreviewImage} /> : null}
            <View style={styles.memberActionRow}>
              <Pressable style={[styles.primaryButton, styles.memberActionButton]} onPress={submitMemoryPhoto} disabled={memorySubmitting}>
                {memorySubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{memoryEditingId ? 'Update Memory Photo' : 'Save Memory Photo'}</Text>}
              </Pressable>
              {memoryEditingId ? (
                <Pressable style={[styles.deleteButton, styles.memberActionButtonSecondary]} onPress={clearMemoryForm}>
                  <Text style={styles.deleteButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>
            {memoryMessage ? <Text style={styles.submitMessage}>{memoryMessage}</Text> : null}

            </>
            ) : null}

            {membersSection === 'memory-list' ? (
              <>
            <View style={styles.memoriesGrid}>
              {choirMemories.map((memory) => (
                <View key={memory.id} style={styles.memoryCard}>
                  <Image source={{ uri: memory.photo_url }} style={styles.memoryThumb} />
                  <View style={styles.memoryInfo}>
                    <Text style={styles.adminName}>{memory.title || 'Untitled Moment'}</Text>
                    {memory.description ? <Text style={styles.adminMeta}>{memory.description}</Text> : null}
                    <View style={styles.memoryCardActions}>
                      <Pressable style={styles.pickButton} onPress={() => applyMemoryForEdit(memory)}>
                        <Text style={styles.pickButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.deleteButton} onPress={() => onDeleteMemory(memory.id)}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            </>
            ) : null}

            <Modal visible={activeYearField !== null} transparent animationType="fade" onRequestClose={() => setActiveYearField(null)}>
              <View style={styles.yearModalBackdrop}>
                <View style={styles.yearModalCard}>
                  <Text style={styles.label}>Select Year</Text>
                  <ScrollView style={styles.yearList}>
                    {activeYearOptions.map((year) => {
                      const isActive = activeYearField ? memberForm[activeYearField] === year : false;
                      return (
                        <Pressable
                          key={year}
                          style={[styles.yearItem, isActive && styles.yearItemActive]}
                          onPress={() => {
                            if (activeYearField) {
                              setYearField(activeYearField, year);
                            }
                            setActiveYearField(null);
                          }}
                        >
                          <Text style={[styles.yearItemText, isActive && styles.yearItemTextActive]}>{year}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Pressable style={styles.primaryButton} onPress={() => setActiveYearField(null)}>
                    <Text style={styles.primaryButtonText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>
        </>
      ) : (
        <>
        <ScrollView
          ref={settingsFormScrollRef}
          nativeID={SETTINGS_SCROLL_CONTAINER_ID}
          contentContainerStyle={[styles.formWrap, { paddingHorizontal: horizontalPadding }]}
          onScroll={(event) => updateSectionScrollState(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        > 
          <View style={[styles.formContent, { maxWidth: contentMaxWidth }]}> 
            <Text style={styles.pendingHint}>
              {isEnglish
                ? 'You are editing page content for English. Switch language in header to edit Amharic content.'
                : 'አሁን የሚያስተካክሉት የአማርኛ የገጽ ይዘት ነው። የእንግሊዝኛ ይዘት ለማስተካከል ከላይ ቋንቋ ይቀይሩ።'}
            </Text>

            <View style={styles.quickSettingCard}>
              <View style={styles.quickSettingHeaderRow}>
                <Text style={styles.quickSettingTitle}>{isEnglish ? 'Lyrics Font Size' : 'የመዝሙር ፊደል መጠን'}</Text>
                <Pressable style={styles.quickSettingLinkButton} onPress={() => setSettingsSection('text-style')}>
                  <Text style={styles.quickSettingLinkText}>{isEnglish ? 'Open text style' : 'ወደ የጽሁፍ ቅርጽ ይሂዱ'}</Text>
                </Pressable>
              </View>
              <View style={styles.pickerRow}>
                <Pressable
                  style={[styles.inlineStepButton, lyricsTextStyle.fontSize <= MIN_TEXT_STYLE_FONT_SIZE && styles.disabledButton]}
                  onPress={() =>
                    setLyricsTextStyle((prev) => ({
                      ...prev,
                      fontSize: Math.max(MIN_TEXT_STYLE_FONT_SIZE, Number(prev.fontSize) - 1),
                    }))
                  }
                  disabled={lyricsTextStyle.fontSize <= MIN_TEXT_STYLE_FONT_SIZE}
                >
                  <Ionicons name="remove" size={14} color="#1E3A8A" />
                </Pressable>
                <View style={[styles.input, styles.pickerButton]}>
                  <Text style={styles.pickerButtonText}>{Math.round(Number(lyricsTextStyle.fontSize) || 12)}</Text>
                </View>
                <Pressable
                  style={[styles.inlineStepButton, lyricsTextStyle.fontSize >= MAX_TEXT_STYLE_FONT_SIZE && styles.disabledButton]}
                  onPress={() =>
                    setLyricsTextStyle((prev) => ({
                      ...prev,
                      fontSize: Math.min(MAX_TEXT_STYLE_FONT_SIZE, Number(prev.fontSize) + 1),
                    }))
                  }
                  disabled={lyricsTextStyle.fontSize >= MAX_TEXT_STYLE_FONT_SIZE}
                >
                  <Ionicons name="add" size={14} color="#1E3A8A" />
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {settingsSectionOptions.map((option) => {
                const active = settingsSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setSettingsSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {settingsSection === 'content' ? (
              <>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {contentSettingsSectionOptions.map((option) => {
                const active = contentSettingsSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setContentSettingsSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {contentSettingsSection === 'home' ? (
              <>
            <Text style={styles.label}>Home ርዕስ</Text>
            <TextInput
              value={pageContent.homePanelTitle}
              onChangeText={(v) => setPageContent((p) => ({ ...p, homePanelTitle: v }))}
              style={styles.input}
              placeholder="Home ርዕስ"
            />

            <Text style={styles.label}>Home መግለጫ</Text>
            <TextInput
              value={pageContent.homePanelText}
              onChangeText={(v) => setPageContent((p) => ({ ...p, homePanelText: v }))}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="Home መግለጫ"
            />
              </>
            ) : null}

            {contentSettingsSection === 'about' ? (
              <>
            <Text style={styles.label}>About ርዕስ</Text>
            <TextInput
              value={pageContent.aboutTitle}
              onChangeText={(v) => setPageContent((p) => ({ ...p, aboutTitle: v }))}
              style={styles.input}
              placeholder="About ርዕስ"
            />

            <Text style={styles.label}>About መግለጫ</Text>
            <TextInput
              value={pageContent.aboutBody}
              onChangeText={(v) => setPageContent((p) => ({ ...p, aboutBody: v }))}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="About መግለጫ"
            />
              </>
            ) : null}

            {contentSettingsSection === 'services' ? (
              <>
            <Text style={styles.label}>Services ርዕስ</Text>
            <TextInput
              value={pageContent.servicesTitle}
              onChangeText={(v) => setPageContent((p) => ({ ...p, servicesTitle: v }))}
              style={styles.input}
              placeholder="Services ርዕስ"
            />

            <Text style={styles.label}>Services ዝርዝር (እያንዳንዱ መስመር አንድ ንጥል)</Text>
            <TextInput
              value={servicesDraft}
              onChangeText={setServicesDraft}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="ንጥሎችን በአዲስ መስመር ያስገቡ"
            />
              </>
            ) : null}

            {contentSettingsSection === 'copyright' ? (
              <>
            <Text style={styles.label}>Copyright ጽሑፍ</Text>
            <TextInput
              value={pageContent.copyrightText}
              onChangeText={(v) => setPageContent((p) => ({ ...p, copyrightText: v }))}
              style={styles.input}
              placeholder="Copyright text"
            />
              </>
            ) : null}

            </>
            ) : null}

            {settingsSection === 'developer' ? (
              <>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {developerSettingsSectionOptions.map((option) => {
                const active = developerSettingsSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setDeveloperSettingsSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {developerSettingsSection === 'profile' ? (
              <>
            <Text style={styles.label}>የዴቨሎፐር ስም</Text>
            <TextInput
              value={developerInfo.name}
              onChangeText={(v) => setDeveloperInfoState((p) => ({ ...p, name: v }))}
              style={styles.input}
              placeholder="Developer name"
            />

            <Text style={styles.label}>የዴቨሎፐር ኢሜይል</Text>
            <TextInput
              value={developerInfo.email}
              onChangeText={(v) => setDeveloperInfoState((p) => ({ ...p, email: v }))}
              style={styles.input}
              autoCapitalize="none"
              placeholder="Developer email"
            />

            <Text style={styles.label}>የዴቨሎፐር ስልክ</Text>
            <TextInput
              value={developerInfo.phone}
              onChangeText={(v) => setDeveloperInfoState((p) => ({ ...p, phone: v }))}
              style={styles.input}
              placeholder="Developer phone"
            />

            <Text style={styles.label}>የዴቨሎፐር መግለጫ</Text>
            <TextInput
              value={developerInfo.bio}
              onChangeText={(v) => setDeveloperInfoState((p) => ({ ...p, bio: v }))}
              style={[styles.input, styles.settingsTextArea]}
              multiline
              placeholder="Developer bio"
            />
              </>
            ) : null}

            {developerSettingsSection === 'social-links' ? (
              <>
            <Text style={styles.label}>የዴቨሎፐር ማህበራዊ መገናኛዎች</Text>
            <View style={styles.categoryManagerCard}>
              <Text style={styles.pendingHint}>አንድ አይኮን ይምረጡ፣ ማሳያ ስም እና ሊንክ ያስገቡ።</Text>
              <View style={styles.socialIconGrid}>
                {SOCIAL_MEDIA_ICON_OPTIONS.map((option) => {
                  const active = socialLinkDraft.iconName === option.iconName;

                  return (
                    <Pressable
                      key={option.iconName}
                      onPress={() =>
                        setSocialLinkDraft((prev) => ({
                          ...prev,
                          iconName: option.iconName,
                          label: prev.label.trim().length > 0 ? prev.label : option.label,
                        }))
                      }
                      style={[styles.socialIconCard, active && styles.socialIconCardActive]}
                    >
                      <Ionicons name={resolveIoniconName(option.iconName)} size={18} color={active ? colors.white : colors.blue700} />
                      <Text style={[styles.socialIconLabel, active && styles.socialIconLabelActive]} numberOfLines={1}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={socialLinkDraft.label}
                onChangeText={(v) => setSocialLinkDraft((prev) => ({ ...prev, label: v }))}
                style={styles.input}
                placeholder="Display label"
              />
              <TextInput
                value={socialLinkDraft.url}
                onChangeText={(v) => setSocialLinkDraft((prev) => ({ ...prev, url: v }))}
                style={styles.input}
                autoCapitalize="none"
                placeholder="https://..."
              />

              <View style={styles.memberActionRow}>
                <Pressable style={[styles.primaryButton, styles.memberActionButton]} onPress={upsertSocialLink}>
                  <Text style={styles.primaryButtonText}>{socialLinkEditingId ? 'Update Link' : 'Add Link'}</Text>
                </Pressable>
                {socialLinkEditingId ? (
                  <Pressable style={[styles.deleteButton, styles.memberActionButtonSecondary]} onPress={clearSocialLinkDraft}>
                    <Text style={styles.deleteButtonText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.socialLinksList}>
                {(developerInfo.socialLinks ?? []).length === 0 ? (
                  <Text style={styles.emptySocialLinksText}>No social links added yet.</Text>
                ) : (
                  developerInfo.socialLinks.map((link) => (
                    <View key={link.id} style={styles.socialLinkRow}>
                      <View style={styles.socialLinkIconWrap}>
                        <Ionicons name={resolveIoniconName(link.iconName)} size={16} color={colors.blue700} />
                      </View>
                      <View style={styles.socialLinkInfo}>
                        <Text style={styles.adminName}>{link.label}</Text>
                        <Text style={styles.adminMeta} numberOfLines={1}>{link.url}</Text>
                      </View>
                      <View style={styles.socialLinkActions}>
                        <Pressable style={styles.pickButton} onPress={() => applySocialLinkForEdit(link)}>
                          <Text style={styles.pickButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable style={styles.deleteButton} onPress={() => deleteSocialLink(link.id)}>
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
              </>
            ) : null}

            </>
            ) : null}

            {settingsSection === 'branding' ? (
              <>
            <Text style={styles.label}>Choir Branding (Header + Background)</Text>
            <View style={styles.categoryManagerCard}>
              <Text style={styles.pendingHint}>
                {isEnglish
                  ? 'Set the animated header title/logo and the shared app background image.'
                  : 'በራስጌ ላይ የሚታይ አርማ/ርዕስ እና የመተግበሪያ ጀርባ ምስል ያስተካክሉ።'}
              </Text>

              <TextInput
                value={appBranding.choirTitle}
                onChangeText={(v) => setAppBranding((prev) => ({ ...prev, choirTitle: v }))}
                style={styles.input}
                placeholder="Johanan Choir"
              />

              <Pressable style={styles.secondaryUploadButton} onPress={pickBrandingLogoPhoto}>
                <Text style={styles.secondaryUploadButtonText}>Select Header Logo Photo</Text>
              </Pressable>
              {appBranding.choirLogoUrl ? <Image source={{ uri: appBranding.choirLogoUrl }} style={styles.memberPreviewImage} /> : null}

              <Pressable style={styles.secondaryUploadButton} onPress={pickBrandingBackgroundPhoto}>
                <Text style={styles.secondaryUploadButtonText}>Select App Background Photo</Text>
              </Pressable>
              {appBranding.backgroundImageUrl ? <Image source={{ uri: appBranding.backgroundImageUrl }} style={styles.memberPreviewImage} /> : null}
            </View>

            </>
            ) : null}

            {settingsSection === 'receivers' ? (
              <>
            <Text style={styles.label}>Contact Receiver Emails (Super Admin)</Text>
            <View style={styles.categoryManagerCard}>
              <Text style={styles.pendingHint}>
                {isEnglish
                  ? 'Super admin can add receiver emails, approve them, and set active for simultaneous delivery.'
                  : 'ሱፐር አድሚን ተቀባይ ኢሜይሎችን ያክላል፣ ያፀድቃል እና ነቃ ያደርጋል።'}
              </Text>

              <TextInput
                value={contactReceiverDraftEmail}
                onChangeText={setContactReceiverDraftEmail}
                style={styles.input}
                placeholder="receiver@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={isSuperAdmin && !contactReceiverBusy}
              />

              <Pressable
                style={[styles.primaryButton, contactReceiverBusy && styles.disabledButton]}
                onPress={addContactReceiverEmail}
                disabled={!isSuperAdmin || contactReceiverBusy}
              >
                <Text style={styles.primaryButtonText}>{isEnglish ? 'Add Receiver' : 'ተቀባይ ጨምር'}</Text>
              </Pressable>

              <View style={styles.socialLinksList}>
                {contactReceivers.length === 0 ? (
                  <Text style={styles.emptySocialLinksText}>
                    {isEnglish ? 'No receiver emails added yet.' : 'እስካሁን የተጨመረ ተቀባይ ኢሜይል የለም።'}
                  </Text>
                ) : (
                  contactReceivers.map((receiver) => (
                    <View key={receiver.id} style={styles.socialLinkRow}>
                      <View style={styles.socialLinkInfo}>
                        <Text style={styles.adminName}>{receiver.email}</Text>
                        <Text style={styles.adminMeta}>
                          {isEnglish ? 'Approved' : 'የጸደቀ'}: {receiver.is_approved ? (isEnglish ? 'Yes' : 'አዎ') : (isEnglish ? 'No' : 'አይ')}
                          {'  •  '}
                          {isEnglish ? 'Active' : 'ነቃ'}: {receiver.is_active ? (isEnglish ? 'Yes' : 'አዎ') : (isEnglish ? 'No' : 'አይ')}
                        </Text>
                      </View>
                      <View style={styles.socialLinkActions}>
                        <Pressable style={styles.pickButton} onPress={() => toggleContactReceiverApproved(receiver)} disabled={!isSuperAdmin || contactReceiverBusy}>
                          <Text style={styles.pickButtonText}>{receiver.is_approved ? (isEnglish ? 'Unapprove' : 'ፈቃድ ሰርዝ') : (isEnglish ? 'Approve' : 'ፍቀድ')}</Text>
                        </Pressable>
                        <Pressable style={styles.pickButton} onPress={() => toggleContactReceiverActive(receiver)} disabled={!isSuperAdmin || contactReceiverBusy}>
                          <Text style={styles.pickButtonText}>{receiver.is_active ? (isEnglish ? 'Deactivate' : 'አቁም') : (isEnglish ? 'Activate' : 'ነቃ አድርግ')}</Text>
                        </Pressable>
                        <Pressable style={styles.deleteButton} onPress={() => removeContactReceiver(receiver)} disabled={!isSuperAdmin || contactReceiverBusy}>
                          <Text style={styles.deleteButtonText}>{isEnglish ? 'Delete' : 'አጥፋ'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            </>
            ) : null}

            {settingsSection === 'password' ? (
              <>
            <Text style={styles.label}>የመተግበሪያ የይለፍ ቃል (6-12)</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={appAccess.appPassword}
                onChangeText={(v) => setAppAccess({ appPassword: v })}
                style={[styles.input, styles.passwordInput]}
                placeholder="john 3:16"
                secureTextEntry={!showAppPassword}
                maxLength={12}
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowAppPassword((prev) => !prev)}>
                <Ionicons name={showAppPassword ? 'eye-off' : 'eye'} size={20} color="#1E3A8A" />
              </Pressable>
            </View>

            </>
            ) : null}

            {settingsSection === 'text-style' ? (
              <>

            <Text style={styles.label}>የገጽ ጽሁፍ ቅርጸት</Text>
            <TextStylePicker value={pageTextStyle} onChange={setPageTextStyle} />

            <Text style={styles.label}>የመዝሙር ጽሁፍ ቅርጸት</Text>
            <TextStylePicker value={lyricsTextStyle} onChange={setLyricsTextStyle} />

            </>
            ) : null}

            {settingsSection === 'music' ? (
              <>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {musicSectionOptions.map((option) => {
                const active = musicSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setMusicSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {musicSection === 'scale' ? (
              <>
            <Text style={styles.label}>Scale Management</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newScaleLabel}
                onChangeText={setNewScaleLabel}
                style={styles.input}
                placeholder="New scale label"
              />
              <TextInput
                value={newScaleValue}
                onChangeText={setNewScaleValue}
                style={styles.input}
                placeholder="Optional value key (defaults to label)"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => submitMusicCategory('scale')}
                style={[styles.primaryButton, categorySaving && styles.disabledButton]}
                disabled={categorySaving}
              >
                <Text style={styles.primaryButtonText}>Add Scale</Text>
              </Pressable>
              <View style={styles.categoryChipsWrap}>
                {scaleOptions.filter((item) => item.value !== 'ALL').map((item) => (
                  <View key={`scale-${item.value}`} style={styles.categoryPreviewChip}>
                    <Text style={styles.categoryPreviewText}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {musicScaleRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'music',
                        id: record.id,
                        type: record.category_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'music',
                        id: record.id,
                        type: record.category_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {musicSection === 'rhythm' ? (
              <>
            <Text style={styles.label}>Rhythm Management</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newRhythmLabel}
                onChangeText={setNewRhythmLabel}
                style={styles.input}
                placeholder="New rhythm label"
              />
              <TextInput
                value={newRhythmValue}
                onChangeText={setNewRhythmValue}
                style={styles.input}
                placeholder="Optional value key (defaults to label)"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => submitMusicCategory('rhythm')}
                style={[styles.primaryButton, categorySaving && styles.disabledButton]}
                disabled={categorySaving}
              >
                <Text style={styles.primaryButtonText}>Add Rhythm</Text>
              </Pressable>
              <View style={styles.categoryChipsWrap}>
                {rhythmOptions.filter((item) => item.value !== 'ALL').map((item) => (
                  <View key={`rhythm-${item.value}`} style={styles.categoryPreviewChip}>
                    <Text style={styles.categoryPreviewText}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {musicRhythmRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'music',
                        id: record.id,
                        type: record.category_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'music',
                        id: record.id,
                        type: record.category_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {categoryMessage ? <Text style={styles.submitMessage}>{categoryMessage}</Text> : null}

            </>
            ) : null}

            {settingsSection === 'member-options' ? (
              <>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsSectionTabsRow}>
              {memberOptionsSectionOptions.map((option) => {
                const active = memberOptionsSection === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.settingsSectionTab, active && styles.settingsSectionTabActive]}
                    onPress={() => setMemberOptionsSection(option.key)}
                  >
                    <Text style={[styles.settingsSectionTabText, active && styles.settingsSectionTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {memberOptionsSection === 'member-category' ? (
              <>
            <Text style={styles.label}>Member Categories</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newMemberCategoryLabel}
                onChangeText={setNewMemberCategoryLabel}
                style={styles.input}
                placeholder="New member category label"
              />
              <TextInput
                value={newMemberCategoryValue}
                onChangeText={setNewMemberCategoryValue}
                style={styles.input}
                placeholder="Optional value key"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => addMemberOptionType('member_category')}
                style={[styles.primaryButton, memberOptionSaving && styles.disabledButton]}
                disabled={memberOptionSaving}
              >
                <Text style={styles.primaryButtonText}>Add Member Category</Text>
              </Pressable>
              {memberCategoryRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {memberOptionsSection === 'education-status' ? (
              <>
            <Text style={styles.label}>Education Statuses</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newEducationLabel}
                onChangeText={setNewEducationLabel}
                style={styles.input}
                placeholder="New education status label"
              />
              <TextInput
                value={newEducationValue}
                onChangeText={setNewEducationValue}
                style={styles.input}
                placeholder="Optional value key"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => addMemberOptionType('education_status')}
                style={[styles.primaryButton, memberOptionSaving && styles.disabledButton]}
                disabled={memberOptionSaving}
              >
                <Text style={styles.primaryButtonText}>Add Education Status</Text>
              </Pressable>
              {educationStatusRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {memberOptionsSection === 'marital-status' ? (
              <>
            <Text style={styles.label}>Marital Statuses</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newMaritalLabel}
                onChangeText={setNewMaritalLabel}
                style={styles.input}
                placeholder="New marital status label"
              />
              <TextInput
                value={newMaritalValue}
                onChangeText={setNewMaritalValue}
                style={styles.input}
                placeholder="Optional value key"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => addMemberOptionType('marital_status')}
                style={[styles.primaryButton, memberOptionSaving && styles.disabledButton]}
                disabled={memberOptionSaving}
              >
                <Text style={styles.primaryButtonText}>Add Marital Status</Text>
              </Pressable>
              {maritalStatusRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {memberOptionsSection === 'occupation' ? (
              <>
            <Text style={styles.label}>Occupations</Text>
            <View style={styles.categoryManagerCard}>
              <TextInput
                value={newOccupationLabel}
                onChangeText={setNewOccupationLabel}
                style={styles.input}
                placeholder="New occupation label"
              />
              <TextInput
                value={newOccupationValue}
                onChangeText={setNewOccupationValue}
                style={styles.input}
                placeholder="Optional value key"
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => addMemberOptionType('occupation')}
                style={[styles.primaryButton, memberOptionSaving && styles.disabledButton]}
                disabled={memberOptionSaving}
              >
                <Text style={styles.primaryButtonText}>Add Occupation</Text>
              </Pressable>
              {occupationRecords.map((record) => (
                <View key={record.id} style={styles.manageItem}>
                  <Pressable
                    style={styles.pickButton}
                    onPress={() =>
                      setOptionEdit({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.pickButtonText}>{record.label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteOption({
                        source: 'member',
                        id: record.id,
                        type: record.option_type,
                        label: record.label,
                        value: record.value,
                      })
                    }
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))}
            </View>
              </>
            ) : null}

            {memberOptionMessage ? <Text style={styles.submitMessage}>{memberOptionMessage}</Text> : null}

            </>
            ) : null}

            <View style={styles.settingsActionRow}>
              <Pressable
                onPress={saveSettings}
                style={[styles.primaryButton, styles.settingsActionButton, (settingsSaving || settingsResetting) && styles.disabledButton]}
                disabled={settingsSaving || settingsResetting}
              >
                {settingsSaving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>{isEnglish ? 'Save Settings' : 'ሴቲንግ አስቀምጥ'}</Text>
                )}
              </Pressable>

              <Pressable
                onPress={restoreSettingsFromDatabase}
                style={[styles.settingsSecondaryButton, styles.settingsActionButton, (settingsSaving || settingsResetting) && styles.disabledButton]}
                disabled={settingsSaving || settingsResetting}
              >
                {settingsResetting ? (
                  <ActivityIndicator color="#1E3A8A" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.settingsSecondaryButtonText}>{isEnglish ? 'Reset to Saved' : 'ወደ የተቀመጠው መልስ'}</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={cancelSettingsEditing}
                style={[styles.settingsCancelButton, styles.settingsActionButton, (settingsSaving || settingsResetting) && styles.disabledButton]}
                disabled={settingsSaving || settingsResetting}
              >
                <Ionicons name="close-circle-outline" size={16} color="#334155" />
                <Text style={styles.settingsCancelButtonText}>{isEnglish ? 'Cancel Settings' : 'ሴቲንግ ሰርዝ'}</Text>
              </Pressable>
            </View>
            {settingsMessage ? <Text style={styles.submitMessage}>{settingsMessage}</Text> : null}
          </View>
        </ScrollView>
        </>
      )}

      <View style={styles.footerDock}>
        <CopyrightFooter />
      </View>

      <ScrollToTopButton visible={showScrollTop} onPress={scrollToTopCurrentSection} />

      <Modal visible={optionEdit !== null} transparent animationType="fade" onRequestClose={() => setOptionEdit(null)}>
        <View style={styles.yearModalBackdrop}>
          <View style={styles.yearModalCard}>
            <Text style={styles.label}>Edit Option</Text>
            <TextInput
              value={optionEdit?.label ?? ''}
              onChangeText={(value) => setOptionEdit((prev) => (prev ? { ...prev, label: value } : prev))}
              style={styles.input}
              placeholder="Label"
            />
            <TextInput
              value={optionEdit?.value ?? ''}
              onChangeText={(value) => setOptionEdit((prev) => (prev ? { ...prev, value } : prev))}
              style={styles.input}
              placeholder="Value"
              autoCapitalize="none"
            />
            <Pressable style={styles.primaryButton} onPress={saveOptionEdit}>
              <Text style={styles.primaryButtonText}>Update</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => setOptionEdit(null)}>
              <Text style={styles.deleteButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TextStylePicker({
  value,
  onChange,
}: {
  value: TextStyleSettings;
  onChange: (next: TextStyleSettings) => void;
}) {
  const normalizedFontSize = Math.min(MAX_TEXT_STYLE_FONT_SIZE, Math.max(MIN_TEXT_STYLE_FONT_SIZE, Number(value.fontSize) || 12));
  const canDecreaseFont = normalizedFontSize > MIN_TEXT_STYLE_FONT_SIZE;
  const canIncreaseFont = normalizedFontSize < MAX_TEXT_STYLE_FONT_SIZE;
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const fontSizeOptions = useMemo(
    () => Array.from({ length: MAX_TEXT_STYLE_FONT_SIZE - MIN_TEXT_STYLE_FONT_SIZE + 1 }, (_, index) => MIN_TEXT_STYLE_FONT_SIZE + index),
    [],
  );

  return (
    <View style={styles.styleCard}>
      <Text style={styles.styleSectionTitle}>Font Family</Text>
      <View style={styles.pillWrap}>
        {FONT_FAMILY_OPTIONS.map((option) => {
          const active = value.fontFamily === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange({ ...value, fontFamily: option.value })}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.styleSectionTitle}>Font Size ({MIN_TEXT_STYLE_FONT_SIZE}-{MAX_TEXT_STYLE_FONT_SIZE})</Text>
      <View style={styles.pickerRow}>
        <Pressable
          style={[styles.inlineStepButton, !canDecreaseFont && styles.disabledButton]}
          onPress={() => onChange({ ...value, fontSize: Math.max(MIN_TEXT_STYLE_FONT_SIZE, normalizedFontSize - 1) })}
          disabled={!canDecreaseFont}
        >
          <Ionicons name="remove" size={14} color="#1E3A8A" />
        </Pressable>
        <Pressable style={[styles.input, styles.pickerButton]} onPress={() => setShowFontSizePicker(true)}>
          <Text style={styles.pickerButtonText}>{normalizedFontSize}</Text>
          <Ionicons name="chevron-down" size={14} color="#1E3A8A" />
        </Pressable>
        <Pressable
          style={[styles.inlineStepButton, !canIncreaseFont && styles.disabledButton]}
          onPress={() => onChange({ ...value, fontSize: Math.min(MAX_TEXT_STYLE_FONT_SIZE, normalizedFontSize + 1) })}
          disabled={!canIncreaseFont}
        >
          <Ionicons name="add" size={14} color="#1E3A8A" />
        </Pressable>
      </View>

      <Modal visible={showFontSizePicker} transparent animationType="fade" onRequestClose={() => setShowFontSizePicker(false)}>
        <View style={styles.yearModalBackdrop}>
          <View style={styles.yearModalCard}>
            <Text style={styles.label}>Select Font Size</Text>
            <ScrollView style={styles.yearList}>
              {fontSizeOptions.map((size) => {
                const active = normalizedFontSize === size;
                return (
                  <Pressable
                    key={size}
                    style={[styles.yearItem, active && styles.yearItemActive]}
                    onPress={() => {
                      onChange({ ...value, fontSize: size });
                      setShowFontSizePicker(false);
                    }}
                  >
                    <Text style={[styles.yearItemText, active && styles.yearItemTextActive]}>{size}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.primaryButton} onPress={() => setShowFontSizePicker(false)}>
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Text style={styles.styleSectionTitle}>Formatting</Text>
      <View style={styles.pillWrap}>
        <Pressable onPress={() => onChange({ ...value, bold: !value.bold })} style={[styles.pill, value.bold && styles.pillActive]}>
          <Text style={[styles.pillText, value.bold && styles.pillTextActive]}>Bold</Text>
        </Pressable>
        <Pressable onPress={() => onChange({ ...value, italic: !value.italic })} style={[styles.pill, value.italic && styles.pillActive]}>
          <Text style={[styles.pillText, value.italic && styles.pillTextActive]}>Italic</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ ...value, underline: !value.underline })}
          style={[styles.pill, value.underline && styles.pillActive]}
        >
          <Text style={[styles.pillText, value.underline && styles.pillTextActive]}>Underline</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ ...value, highlight: !value.highlight })}
          style={[styles.pill, value.highlight && styles.pillActive]}
        >
          <Text style={[styles.pillText, value.highlight && styles.pillTextActive]}>Highlight</Text>
        </Pressable>
      </View>

      {value.highlight ? (
        <>
          <Text style={styles.styleSectionTitle}>Highlight Color</Text>
          <View style={styles.colorWrap}>
            <Pressable
              onPress={() => onChange({ ...value, highlight: false })}
              style={[styles.noneColorButton, !value.highlight && styles.noneColorButtonActive]}
            >
              <Text style={[styles.noneColorButtonText, !value.highlight && styles.noneColorButtonTextActive]}>None</Text>
            </Pressable>
            {HIGHLIGHT_COLOR_OPTIONS.map((option) => {
              const active = value.highlightColor === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => onChange({ ...value, highlightColor: option })}
                  style={[styles.colorDot, { backgroundColor: option }, active && styles.colorDotActive]}
                />
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.stylePreviewLabel}>Preview</Text>
      <Text style={[styles.stylePreviewText, buildFormattedTextStyle(value)]}>መዝሙር የጽሁፍ ቅርጸት ሙከራ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: colors.blue900,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 19,
  },
  headerSub: {
    color: '#DBEAFE',
    fontSize: 12,
  },
  logout: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  modeWrap: {
    paddingVertical: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingRight: 12,
    paddingLeft: 2,
  },
  modeRowScroller: {
    width: '100%',
    minHeight: 46,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E40AF',
    flexShrink: 0,
    minHeight: 38,
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#0A2E6E',
  },
  modeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  quickSettingCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    backgroundColor: '#F8FAFF',
    padding: 12,
    marginBottom: 10,
  },
  quickSettingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  quickSettingTitle: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '800',
  },
  quickSettingLinkButton: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickSettingLinkText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsSectionTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    paddingBottom: 10,
    minWidth: '100%',
  },
  settingsSectionTab: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsSectionTabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  settingsSectionTabText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  settingsSectionTabTextActive: {
    color: colors.white,
  },
  formWrap: {
    paddingBottom: 80,
  },
  formContent: {
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: colors.white,
    fontSize: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pickerButton: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  pickerButtonText: {
    color: colors.blue900,
    fontSize: 12,
  },
  dropdownWrap: {
    marginBottom: 10,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    color: colors.blue900,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  dropdownItemActive: {
    backgroundColor: '#DBEAFE',
  },
  dropdownItemText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: '#0A2E6E',
    fontWeight: '700',
  },
  clearPickerButton: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  clearPickerButtonText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  yearModalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  yearModalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: 500,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
  },
  dateModalCard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: 560,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
  },
  dateColumnsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateColumn: {
    flex: 1,
  },
  dateColumnTitle: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  dateColumnList: {
    maxHeight: 320,
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateModalAction: {
    flex: 1,
    marginBottom: 0,
  },
  yearList: {
    marginBottom: 12,
  },
  yearItem: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  yearItemActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  yearItemText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  yearItemTextActive: {
    color: colors.white,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  settingsTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  styleCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    padding: 10,
    marginBottom: 12,
  },
  styleSectionTitle: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  pillActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  pillText: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: colors.white,
  },
  colorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  noneColorButton: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  noneColorButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  noneColorButtonText: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '700',
  },
  noneColorButtonTextActive: {
    color: colors.white,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  colorDotActive: {
    borderColor: '#0A2E6E',
    borderWidth: 2,
  },
  stylePreviewLabel: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  stylePreviewText: {
    color: colors.blue900,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue900,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineStepButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 8,
  },
  rhythmChips: {
    marginTop: 6,
  },
  chip: {
    minWidth: 78,
    maxWidth: 128,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  chipText: {
    color: colors.blue900,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.white,
  },
  primaryButton: {
    backgroundColor: colors.blue700,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.7,
  },
  settingsActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  settingsActionButton: {
    marginBottom: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  settingsSecondaryButton: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  settingsSecondaryButtonText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsCancelButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
  },
  settingsCancelButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryManagerCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  socialIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  socialIconCard: {
    minWidth: 96,
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  socialIconCardActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  socialIconLabel: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  socialIconLabelActive: {
    color: colors.white,
  },
  socialLinksList: {
    gap: 8,
    marginTop: 6,
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: colors.white,
    padding: 10,
  },
  socialLinkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkInfo: {
    flex: 1,
  },
  socialLinkActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  emptySocialLinksText: {
    color: '#475569',
    fontSize: 12,
    fontStyle: 'italic',
  },
  categoryPreviewChip: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryPreviewText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  manageItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  pickButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pickButtonText: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  formSecondaryActionButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  formSecondaryActionButtonText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  analyticsTotalCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsTotalLabel: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  analyticsTotalValue: {
    color: '#0A2E6E',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  analyticsMiniCard: {
    minWidth: 120,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  analyticsMiniLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  analyticsMiniValue: {
    marginTop: 2,
    color: '#1E3A8A',
    fontSize: 20,
    fontWeight: '800',
  },
  secondaryUploadButton: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryUploadButtonText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  memberPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#E2E8F0',
  },
  memberActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  memberActionButton: {
    flex: 1,
    marginBottom: 0,
  },
  memberActionButtonSecondary: {
    marginLeft: 0,
  },
  memberCategorySection: {
    marginBottom: 10,
  },
  memberCategorySectionTitle: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  memberCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 10,
    marginBottom: 8,
  },
  memberCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  memberCardInfo: {
    flex: 1,
  },
  memberThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  memberCardActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  memoriesGrid: {
    gap: 8,
    marginBottom: 12,
  },
  memoryCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memoryThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  memoryInfo: {
    flex: 1,
  },
  memoryCardActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  permissionItem: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    marginBottom: 8,
  },
  permissionItemActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8',
  },
  permissionText: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '600',
  },
  adminItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  adminName: {
    color: colors.blue900,
    fontSize: 12,
    fontWeight: '700',
  },
  adminMeta: {
    color: '#475569',
    fontSize: 12,
  },
  pendingHint: {
    fontSize: 12,
    marginBottom: 10,
    color: '#1E293B',
    lineHeight: 20,
  },
  submitMessage: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
    color: '#0A2E6E',
    fontWeight: '600',
    lineHeight: 20,
  },
  footerDock: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#EFF6FF',
  },
});
