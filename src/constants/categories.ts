import {
  ChoirMemberCategory,
  EducationStatus,
  FontFamilyOption,
  MaritalStatus,
  RhythmCategory,
  ScaleCategory,
} from '../types';

export const SCALE_OPTIONS: Array<{ label: string; value: ScaleCategory }> = [
  { label: 'ሁሉም መዝሙሮች', value: 'ALL' },
  { label: 'ትዝታ ሜጀር (1st)', value: 'TEZETA_MAJOR' },
  { label: 'ናቹራል ማይነር (2nd)', value: 'NATURAL_MINOR' },
  { label: 'አምባሰል ሜጀር (5th)', value: 'AMBASSEL_MAJOR' },
  { label: 'ባቲ ማይነር (6th)', value: 'BATI_MINOR' },
  { label: 'ትዝታ ማይነር (ሀገሪኛ)', value: 'TEZETA_MINOR_HAGERIGNA' },
  { label: 'አምባሰል ማይነር (ሀገሪኛ)', value: 'AMBASSEL_MINOR_HAGERIGNA' },
  { label: 'ባቲ ሜጀር (ሀገርኛ)', value: 'BATI_MAJOR_HAGERIGNA' },
  { label: 'ከምባቲኛ', value: 'KAMBATIGNA' },
];

export const RHYTHM_OPTIONS: Array<{ label: string; value: RhythmCategory }> = [
  { label: 'ሁሉም ሪትሞች', value: 'ALL' },
  { label: 'ዋልትዝ', value: 'WALTZ' },
  { label: 'ሬጌ', value: 'REGGAE' },
  { label: 'ቺክ-ቺካ', value: 'CHIK_CHIKA' },
  { label: 'ባላድ', value: 'BALLAD' },
  { label: 'ስሎው ሮክ', value: 'SLOW_ROCK' },
  { label: 'ዲስኮ / አፍሪካ', value: 'DISCO_AFRICA' },
  { label: 'ካንትሪ ባላድ', value: 'COUNTRY_BALLAD' },
  { label: 'ሳምባ', value: 'SAMBA' },
  { label: 'ትግርኛ', value: 'TIGRIGNA' },
];

export const TRANSPOSE_OPTIONS: Array<{ label: string; value: number }> = Array.from(
  { length: 25 },
  (_unused, index) => {
    const value = index - 12;
    const sign = value > 0 ? '+' : '';
    return {
      label: `${sign}${value}`,
      value,
    };
  },
);

export const PERMISSION_OPTIONS = [
  { key: 'lyrics.create', label: 'መዝሙር መጨመር' },
  { key: 'lyrics.update', label: 'መዝሙር ማስተካከል' },
  { key: 'lyrics.delete', label: 'መዝሙር ማጥፋት' },
  { key: 'admins.manage', label: 'አድሚን መቆጣጠር' },
];

export const FONT_FAMILY_OPTIONS: Array<{ label: string; value: FontFamilyOption }> = [
  { label: 'System', value: 'SYSTEM' },
  { label: 'Serif', value: 'SERIF' },
  { label: 'Sans', value: 'SANS_SERIF' },
  { label: 'Mono', value: 'MONOSPACE' },
];

export const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 16, 18];

export const HIGHLIGHT_COLOR_OPTIONS = [
  '#FEF08A',
  '#FDE68A',
  '#BFDBFE',
  '#C7F9CC',
  '#FBCFE8',
];

export const CHOIR_MEMBER_CATEGORY_OPTIONS: Array<{ label: string; value: ChoirMemberCategory }> = [
  { label: 'All Choir Leds (All Choir Leaders)', value: 'CHOIR_LEADERS' },
  { label: 'Recent Committees (Former Committees)', value: 'FORMER_COMMITTEES' },
  { label: 'Current Committees (Current Committees)', value: 'CURRENT_COMMITTEES' },
  { label: 'All-time Zema Team (All-time Zema Team)', value: 'ZEMA_TEAM' },
  { label: 'Prayers Team (Prayers Team)', value: 'PRAYERS_TEAM' },
  { label: 'Worship Team', value: 'WORSHIP_TEAM' },
  { label: 'Keyboardists', value: 'KEYBOARDISTS' },
  { label: 'Lead Vocalists', value: 'LEAD_VOCALISTS' },
  { label: 'Most Poem Contributors', value: 'MOST_POEM_CONTRIBUTORS' },
  { label: 'Members Abroad', value: 'MEMBERS_ABROAD' },
  { label: 'Graduates', value: 'OUT_OF_TOWN_GRADUATES' },
  { label: 'Undergraduates', value: 'OUT_OF_TOWN_UNDERGRADUATES' },
  { label: 'Highschool', value: 'OUT_OF_TOWN_HIGHSCHOOL' },
  { label: 'Businessman/Woman', value: 'BUSINESS_PEOPLE' },
];

export const MARITAL_STATUS_OPTIONS: Array<{ label: string; value: MaritalStatus }> = [
  { label: 'Single', value: 'SINGLE' },
  { label: 'Married', value: 'MARRIED' },
  { label: 'Other', value: 'OTHER' },
];

export const EDUCATION_STATUS_OPTIONS: Array<{ label: string; value: EducationStatus }> = [
  { label: 'Graduate', value: 'GRADUATE' },
  { label: 'Undergraduate', value: 'UNDERGRADUATE' },
  { label: 'Highschool', value: 'HIGHSCHOOL' },
  { label: 'Businessman/Woman', value: 'BUSINESS' },
  { label: 'Other', value: 'OTHER' },
];

export const OCCUPATION_OPTIONS = [
  'Businessman/Woman',
  'Doctor',
  'HO',
  'Anesthesia',
  'Nurse',
  'Teacher',
  'Lecturer',
  'Professor',
  'Scientist',
  'Phd',
  'IT related',
  'Software',
  'Campus Student',
  'Highschool Student',
  'Housewife',
  'Freelancer',
  'Other',
];

export const ADDRESS_SCOPE_OPTIONS = [
  { label: 'Abroad', value: 'ABROAD' as const },
  { label: 'Countryside', value: 'COUNTRYSIDE' as const },
];

export const WORLD_COUNTRY_OPTIONS = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
  'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti',
  'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
  'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea',
  'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export const ETHIOPIA_MAJOR_CITY_OPTIONS = [
  'Addis Ababa', 'Adama', 'Adigrat', 'Ambo', 'Arba Minch', 'Asella', 'Assosa', 'Axum', 'Bahir Dar',
  'Bishoftu', 'Butajira', 'Debre Birhan', 'Debre Markos', 'Dessie', 'Dilla', 'Dire Dawa', 'Durame',
  'Gambella', 'Goba', 'Gondar', 'Halaba', 'Harar', 'Hawassa', 'Hosaena', 'Jigjiga', 'Jimma', 'Mekelle',
  'Nekemte', 'Robe', 'Semera', 'Shashemene', 'Shire', 'Silte', 'Wolaita Sodo', 'Wolkite'
];
