-- Johanan Choir Lyrics App schema
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'pending_admin' check (role in ('pending_admin', 'admin', 'super_admin')),
  permissions text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward-compatible migrations for older profiles tables.
alter table public.profiles
add column if not exists role text not null default 'pending_admin';

alter table public.profiles
add column if not exists permissions text[] not null default array[]::text[];

alter table public.profiles
add column if not exists full_name text not null default 'Admin';

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.lyrics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  number integer,
  transpose integer not null default 0,
  scale text not null,
  rhythm text not null,
  tags text[],
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lyrics
add column if not exists transpose integer not null default 0;

alter table public.lyrics
add column if not exists audio_url text;

create table if not exists public.lyric_likes (
  lyric_id uuid not null references public.lyrics(id) on delete cascade,
  device_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lyric_id, device_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_page_content (
  id smallint primary key default 1,
  home_panel_title text not null default 'እንኳን ደህና መጡ',
  home_panel_text text not null default 'በዚህ መተግበሪያ የመዝሙር ግጥሞችን በፍጥነት መፈለግ፣ መውደድ እና ተወዳጅ ዝርዝር ውስጥ ማስቀመጥ ይችላሉ።',
  about_title text not null default 'ስለ መተግበሪያው',
  about_body text not null default 'ይህ መተግበሪያ የዮሐናን መዘምራን የመዝሙር ግጥሞችን በአማርኛ ለማስቀመጥ፣ ለማየት እና ለማስተዳደር የተሰራ ነው።',
  services_title text not null default 'አገልግሎቶች',
  services_items text[] not null default array[
    'የመዝሙር ፍለጋ እና ማጣሪያ',
    'ስኬል/ሪትም መከፋፈል',
    'ተወዳጅ ዝርዝር እና ላይክ',
    'ኦፍላይን ንባብ እና ማዘመን',
    'አድሚን እና ሱፐር አድሚን አስተዳደር'
  ]::text[],
  copyright_text text not null default 'Copyright © Johanan Choir. All rights reserved.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 1)
);

create table if not exists public.app_developer_info (
  id smallint primary key default 1,
  name text not null default 'Peniel Abebe',
  email text not null default 'penielabebe93abebe@gmail.com',
  phone text not null default '',
  bio text not null default 'Choir application developer and maintainer.',
  social_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 1)
);

alter table public.app_developer_info
add column if not exists social_links jsonb not null default '[]'::jsonb;

create table if not exists public.app_security_settings (
  id smallint primary key default 1,
  app_password text not null default 'john 3:16',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 1),
  check (char_length(app_password) between 6 and 12)
);

create table if not exists public.app_branding_settings (
  id smallint primary key default 1,
  background_image_url text not null default '',
  choir_logo_url text not null default '',
  choir_title text not null default 'Johanan Choir',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 1)
);

alter table public.app_branding_settings
add column if not exists background_image_url text not null default '';

alter table public.app_branding_settings
add column if not exists choir_logo_url text not null default '';

alter table public.app_branding_settings
add column if not exists choir_title text not null default 'Johanan Choir';

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  lyric_suggestion text,
  spelling_error text,
  target_email text not null default 'penielabebe93abebe@gmail.com',
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_contact_receivers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_approved boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_contact_receivers
add column if not exists is_approved boolean not null default false;

alter table public.app_contact_receivers
add column if not exists is_active boolean not null default false;

update public.app_contact_receivers
set is_active = false
where is_approved = false and is_active = true;

create table if not exists public.choir_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  joined_date date,
  batch_year integer,
  photo_url text,
  member_category text not null check (char_length(trim(member_category)) > 0),
  member_categories text[] not null default array['CHOIR_LEADERS']::text[],
  address text,
  occupation text,
  marital_status text not null default 'OTHER' check (char_length(trim(marital_status)) > 0),
  education_status text not null default 'OTHER' check (char_length(trim(education_status)) > 0),
  committee_service_start_year integer,
  committee_service_end_year integer,
  retired_year integer,
  current_status_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.choir_memories (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  photo_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.choir_members
add column if not exists member_categories text[] not null default array['CHOIR_LEADERS']::text[];

do $$
declare
  v_constraint_name text;
begin
  select c.conname
  into v_constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'choir_members'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%member_category in (%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.choir_members drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.choir_members
drop constraint if exists choir_members_member_category_check;

alter table public.choir_members
add constraint choir_members_member_category_check
check (
  member_category is null
  or char_length(trim(member_category)) > 0
);

create or replace function public.text_array_items_non_empty(p_values text[])
returns boolean
language plpgsql
immutable
as $$
declare
  item text;
begin
  if p_values is null or array_length(p_values, 1) is null then
    return false;
  end if;

  foreach item in array p_values
  loop
    if item is null or char_length(trim(item)) = 0 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

alter table public.choir_members
drop constraint if exists choir_members_member_categories_check;

alter table public.choir_members
add constraint choir_members_member_categories_check
check (
  array_length(member_categories, 1) >= 1
  and public.text_array_items_non_empty(member_categories)
);

alter table public.choir_members
drop constraint if exists choir_members_marital_status_check;

alter table public.choir_members
add constraint choir_members_marital_status_check
check (char_length(trim(marital_status)) > 0);

alter table public.choir_members
drop constraint if exists choir_members_education_status_check;

alter table public.choir_members
add constraint choir_members_education_status_check
check (char_length(trim(education_status)) > 0);

update public.choir_members
set member_categories =
  case
    when member_categories is null or coalesce(array_length(member_categories, 1), 0) = 0
      then array[coalesce(nullif(member_category, 'JUST_MEMBER'), 'CHOIR_LEADERS')]::text[]
    else array_replace(member_categories, 'JUST_MEMBER', 'CHOIR_LEADERS')
  end;

update public.choir_members
set member_category = 'CHOIR_LEADERS'
where member_category = 'JUST_MEMBER';

create table if not exists public.music_categories (
  id uuid primary key default gen_random_uuid(),
  category_type text not null check (category_type in ('scale', 'rhythm')),
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_type, value)
);

create table if not exists public.member_options (
  id uuid primary key default gen_random_uuid(),
  option_type text not null check (option_type in ('member_category', 'education_status', 'occupation', 'marital_status')),
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_type, value)
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_profiles_updated_at on public.profiles;
create trigger tr_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_lyrics_updated_at on public.lyrics;
create trigger tr_lyrics_updated_at
before update on public.lyrics
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_lyric_likes_updated_at on public.lyric_likes;
create trigger tr_lyric_likes_updated_at
before update on public.lyric_likes
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_settings_updated_at on public.app_settings;
create trigger tr_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_contact_messages_updated_at on public.contact_messages;
create trigger tr_contact_messages_updated_at
before update on public.contact_messages
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_contact_receivers_updated_at on public.app_contact_receivers;
create trigger tr_app_contact_receivers_updated_at
before update on public.app_contact_receivers
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_page_content_updated_at on public.app_page_content;
create trigger tr_app_page_content_updated_at
before update on public.app_page_content
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_developer_info_updated_at on public.app_developer_info;
create trigger tr_app_developer_info_updated_at
before update on public.app_developer_info
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_security_settings_updated_at on public.app_security_settings;
create trigger tr_app_security_settings_updated_at
before update on public.app_security_settings
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_app_branding_settings_updated_at on public.app_branding_settings;
create trigger tr_app_branding_settings_updated_at
before update on public.app_branding_settings
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_choir_members_updated_at on public.choir_members;
create trigger tr_choir_members_updated_at
before update on public.choir_members
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_choir_memories_updated_at on public.choir_memories;
create trigger tr_choir_memories_updated_at
before update on public.choir_memories
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_music_categories_updated_at on public.music_categories;
create trigger tr_music_categories_updated_at
before update on public.music_categories
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_member_options_updated_at on public.member_options;
create trigger tr_member_options_updated_at
before update on public.member_options
for each row
execute function public.handle_updated_at();

insert into public.app_page_content (id)
values (1)
on conflict (id) do nothing;

insert into public.app_developer_info (id)
values (1)
on conflict (id) do nothing;

insert into public.app_security_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.app_branding_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.music_categories (category_type, value, label, sort_order)
values
  ('scale', 'TEZETA_MAJOR', 'ትዝታ ሜጀር (1st)', 10),
  ('scale', 'NATURAL_MINOR', 'ናቹራል ማይነር (2nd)', 20),
  ('scale', 'AMBASSEL_MAJOR', 'አምባሰል ሜጀር (5th)', 30),
  ('scale', 'BATI_MINOR', 'ባቲ ማይነር (6th)', 40),
  ('scale', 'TEZETA_MINOR_HAGERIGNA', 'ትዝታ ማይነር (ሀገሪኛ)', 50),
  ('scale', 'AMBASSEL_MINOR_HAGERIGNA', 'አምባሰል ማይነር (ሀገሪኛ)', 60),
  ('scale', 'BATI_MAJOR_HAGERIGNA', 'ባቲ ሜጀር (ሀገሪኛ)', 70),
  ('scale', 'KAMBATIGNA', 'ከምባቲኛ', 80),
  ('rhythm', 'WALTZ', 'ዋልትዝ', 10),
  ('rhythm', 'REGGAE', 'ሬጌ', 20),
  ('rhythm', 'CHIK_CHIKA', 'ቺክ-ቺካ', 30),
  ('rhythm', 'BALLAD', 'ባላድ', 40),
  ('rhythm', 'SLOW_ROCK', 'ስሎው ሮክ', 50),
  ('rhythm', 'DISCO_AFRICA', 'ዲስኮ / አፍሪካ', 60),
  ('rhythm', 'COUNTRY_BALLAD', 'ካንትሪ ባላድ', 70),
  ('rhythm', 'SAMBA', 'ሳምባ', 80),
  ('rhythm', 'TIGRIGNA', 'ትግርኛ', 90)
on conflict (category_type, value) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.member_options (option_type, value, label, sort_order)
values
  ('member_category', 'CHOIR_LEADERS', 'Choir Leaders', 10),
  ('member_category', 'FORMER_COMMITTEES', 'Former Committees', 20),
  ('member_category', 'CURRENT_COMMITTEES', 'Current Committees', 30),
  ('member_category', 'ZEMA_TEAM', 'Zema Team', 40),
  ('member_category', 'PRAYERS_TEAM', 'Prayers Team', 50),
  ('member_category', 'WORSHIP_TEAM', 'Worship Team', 60),
  ('member_category', 'BUSINESS_PEOPLE', 'Business People', 70),
  ('member_category', 'KEYBOARDISTS', 'Keyboardists', 80),
  ('member_category', 'LEAD_VOCALISTS', 'Lead Vocalists', 90),
  ('member_category', 'MOST_POEM_CONTRIBUTORS', 'Most Poem Contributors', 100),
  ('member_category', 'MEMBERS_ABROAD', 'Members Abroad', 110),
  ('member_category', 'OUT_OF_TOWN_GRADUATES', 'Out of Town Graduates', 120),
  ('member_category', 'OUT_OF_TOWN_UNDERGRADUATES', 'Out of Town Undergraduates', 130),
  ('member_category', 'OUT_OF_TOWN_HIGHSCHOOL', 'Out of Town Highschool', 140),
  ('education_status', 'HIGH_SCHOOL', 'High School', 10),
  ('education_status', 'UNDERGRADUATE', 'Undergraduate', 20),
  ('education_status', 'GRADUATE', 'Graduate', 30),
  ('education_status', 'OTHER', 'Other', 40),
  ('marital_status', 'SINGLE', 'Single', 10),
  ('marital_status', 'MARRIED', 'Married', 20),
  ('marital_status', 'ENGAGED', 'Engaged', 30),
  ('marital_status', 'OTHER', 'Other', 40),
  ('occupation', 'Student', 'Student', 10),
  ('occupation', 'Government Worker', 'Government Worker', 20),
  ('occupation', 'Business Person', 'Business Person', 30),
  ('occupation', 'Private Employee', 'Private Employee', 40),
  ('occupation', 'Other', 'Other', 50)
on conflict (option_type, value) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_active = true;

create or replace function public.sync_lyrics_like_count()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.lyrics
  set likes_count = (
    select count(*)::int
    from public.lyric_likes
    where lyric_id = coalesce(new.lyric_id, old.lyric_id)
      and is_active = true
  )
  where id = coalesce(new.lyric_id, old.lyric_id);

  return coalesce(new, old);
end;
$$;

create or replace function public.ensure_my_profile(p_full_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1), 'Admin');
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, full_name, role, permissions)
  values (v_uid, v_email, v_name, 'pending_admin', array[]::text[])
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name)
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.bootstrap_super_admin(p_owner_email text, p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_existing_super uuid;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_email <> lower(trim(p_owner_email)) then
    raise exception 'Only owner email can initialize super admin';
  end if;

  select id into v_existing_super
  from public.profiles
  where role = 'super_admin'
  limit 1;

  if v_existing_super is not null and v_existing_super <> v_uid then
    raise exception 'Super admin already initialized';
  end if;

  insert into public.profiles (id, email, full_name, role, permissions)
  values (
    v_uid,
    v_email,
    coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1), 'Owner'),
    'super_admin',
    array['lyrics.create', 'lyrics.update', 'lyrics.delete', 'admins.manage']::text[]
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'super_admin',
        permissions = array['lyrics.create', 'lyrics.update', 'lyrics.delete', 'admins.manage']::text[]
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.is_current_user_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_super boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  select exists(
    select 1
    from public.profiles p
    where p.id = v_uid
      and p.role = 'super_admin'
  ) into v_is_super;

  return v_is_super;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_super_exists boolean;
  v_owner_email constant text := 'penielabebe93@gmail.com';
begin
  select exists(select 1 from public.profiles where role = 'super_admin') into v_super_exists;

  insert into public.profiles (id, email, full_name, role, permissions)
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(v_email, '@', 1), 'Admin'),
    case
      when v_email = v_owner_email and not v_super_exists then 'super_admin'
      else 'pending_admin'
    end,
    case
      when v_email = v_owner_email and not v_super_exists
        then array['lyrics.create', 'lyrics.update', 'lyrics.delete', 'admins.manage']::text[]
      else array[]::text[]
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

grant execute on function public.ensure_my_profile(text) to authenticated;
grant execute on function public.bootstrap_super_admin(text, text) to authenticated;
grant execute on function public.is_current_user_super_admin() to authenticated;

drop trigger if exists tr_auth_user_created on auth.users;
create trigger tr_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

drop trigger if exists tr_sync_likes_insert on public.lyric_likes;
create trigger tr_sync_likes_insert
after insert on public.lyric_likes
for each row
execute function public.sync_lyrics_like_count();

drop trigger if exists tr_sync_likes_update on public.lyric_likes;
create trigger tr_sync_likes_update
after update on public.lyric_likes
for each row
execute function public.sync_lyrics_like_count();

-- RLS
alter table public.profiles enable row level security;
alter table public.lyrics enable row level security;
alter table public.lyric_likes enable row level security;
alter table public.app_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.app_contact_receivers enable row level security;
alter table public.app_page_content enable row level security;
alter table public.app_developer_info enable row level security;
alter table public.app_security_settings enable row level security;
alter table public.app_branding_settings enable row level security;
alter table public.choir_members enable row level security;
alter table public.choir_memories enable row level security;
alter table public.music_categories enable row level security;
alter table public.member_options enable row level security;

-- Public read access for lyrics.
drop policy if exists lyrics_public_read on public.lyrics;
create policy lyrics_public_read
on public.lyrics
for select
to anon, authenticated
using (true);

-- Admin write access for lyrics.
drop policy if exists lyrics_admin_write on public.lyrics;
create policy lyrics_admin_write
on public.lyrics
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

-- Profiles: users can read their own record, super admin can read/manage all.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_current_user_super_admin());

drop policy if exists profiles_super_admin_update on public.profiles;
create policy profiles_super_admin_update
on public.profiles
for update
to authenticated
using (public.is_current_user_super_admin())
with check (public.is_current_user_super_admin());

-- Likes: public insert/update allowed for device-based tracking.
drop policy if exists lyric_likes_public_read on public.lyric_likes;
create policy lyric_likes_public_read
on public.lyric_likes
for select
to anon, authenticated
using (true);

drop policy if exists lyric_likes_public_write on public.lyric_likes;
create policy lyric_likes_public_write
on public.lyric_likes
for insert
to anon, authenticated
with check (true);

drop policy if exists lyric_likes_public_update on public.lyric_likes;
create policy lyric_likes_public_update
on public.lyric_likes
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write
on public.app_settings
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_page_content_public_read on public.app_page_content;
create policy app_page_content_public_read
on public.app_page_content
for select
to anon, authenticated
using (true);

drop policy if exists app_page_content_admin_write on public.app_page_content;
create policy app_page_content_admin_write
on public.app_page_content
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_developer_info_public_read on public.app_developer_info;
create policy app_developer_info_public_read
on public.app_developer_info
for select
to anon, authenticated
using (true);

drop policy if exists app_developer_info_admin_write on public.app_developer_info;
create policy app_developer_info_admin_write
on public.app_developer_info
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_security_settings_public_read on public.app_security_settings;
create policy app_security_settings_public_read
on public.app_security_settings
for select
to anon, authenticated
using (true);

drop policy if exists app_security_settings_admin_write on public.app_security_settings;
create policy app_security_settings_admin_write
on public.app_security_settings
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_branding_settings_public_read on public.app_branding_settings;
create policy app_branding_settings_public_read
on public.app_branding_settings
for select
to anon, authenticated
using (true);

drop policy if exists app_branding_settings_admin_write on public.app_branding_settings;
create policy app_branding_settings_admin_write
on public.app_branding_settings
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read
on public.contact_messages
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists contact_messages_admin_update on public.contact_messages;
create policy contact_messages_admin_update
on public.contact_messages
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_contact_receivers_public_active_read on public.app_contact_receivers;
create policy app_contact_receivers_public_active_read
on public.app_contact_receivers
for select
to anon, authenticated
using (is_approved = true and is_active = true);

drop policy if exists app_contact_receivers_admin_read on public.app_contact_receivers;
create policy app_contact_receivers_admin_read
on public.app_contact_receivers
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists app_contact_receivers_super_admin_write on public.app_contact_receivers;
create policy app_contact_receivers_super_admin_write
on public.app_contact_receivers
for all
to authenticated
using (public.is_current_user_super_admin())
with check (public.is_current_user_super_admin());

drop policy if exists choir_members_public_read on public.choir_members;
create policy choir_members_public_read
on public.choir_members
for select
to anon, authenticated
using (true);

drop policy if exists choir_members_admin_write on public.choir_members;
create policy choir_members_admin_write
on public.choir_members
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists choir_memories_public_read on public.choir_memories;
create policy choir_memories_public_read
on public.choir_memories
for select
to anon, authenticated
using (true);

drop policy if exists choir_memories_admin_write on public.choir_memories;
create policy choir_memories_admin_write
on public.choir_memories
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists music_categories_public_read on public.music_categories;
create policy music_categories_public_read
on public.music_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists music_categories_admin_write on public.music_categories;
create policy music_categories_admin_write
on public.music_categories
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists member_options_public_read on public.member_options;
create policy member_options_public_read
on public.member_options
for select
to anon, authenticated
using (is_active = true);

drop policy if exists member_options_admin_write on public.member_options;
create policy member_options_admin_write
on public.member_options
for all
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
  or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

insert into storage.buckets (id, name, public)
values ('choir-members', 'choir-members', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lyric-audios', 'lyric-audios', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('choir-memories', 'choir-memories', true)
on conflict (id) do nothing;

drop policy if exists choir_members_bucket_public_read on storage.objects;
create policy choir_members_bucket_public_read
on storage.objects
for select
to public
using (bucket_id = 'choir-members');

drop policy if exists choir_members_bucket_admin_write on storage.objects;
create policy choir_members_bucket_admin_write
on storage.objects
for all
to authenticated
using (
  bucket_id = 'choir-members'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
)
with check (
  bucket_id = 'choir-members'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
);

drop policy if exists lyric_audios_bucket_public_read on storage.objects;
create policy lyric_audios_bucket_public_read
on storage.objects
for select
to public
using (bucket_id = 'lyric-audios');

drop policy if exists lyric_audios_bucket_admin_write on storage.objects;
create policy lyric_audios_bucket_admin_write
on storage.objects
for all
to authenticated
using (
  bucket_id = 'lyric-audios'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
)
with check (
  bucket_id = 'lyric-audios'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
);

drop policy if exists choir_memories_bucket_public_read on storage.objects;
create policy choir_memories_bucket_public_read
on storage.objects
for select
to public
using (bucket_id = 'choir-memories');

drop policy if exists choir_memories_bucket_admin_write on storage.objects;
create policy choir_memories_bucket_admin_write
on storage.objects
for all
to authenticated
using (
  bucket_id = 'choir-memories'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
)
with check (
  bucket_id = 'choir-memories'
  and (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'penielabebe93@gmail.com'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
);

-- Create first super admin profile manually after signing up in auth.users.
-- First super admin now uses app flow:
-- 1) Set EXPO_PUBLIC_OWNER_EMAIL in app env.
-- 2) Sign up from admin page using "1ኛ ሱፐር አድሚን" with same email.
-- 3) Function bootstrap_super_admin() promotes that account once.
-- Additional convenience:
-- If a new auth user is created with email penielabebe93@gmail.com and no super admin exists,
-- trigger handle_new_auth_user() auto-promotes to super_admin.
