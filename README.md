# Johanan Choir Lyrics App (Expo + Supabase)

Amharic-first lyrics mobile app with offline reading, search/filter/sort, likes/favorites, and role-based admin dashboard.

## Features

- Public users (no sign in required):
  - Browse all lyrics immediately after install
  - Search by title/content
  - Filter by scale and rhythm
  - Sort by number or alphabetically
  - Like lyrics and add favorites
  - Offline viewing from local cache
- Admin/Super Admin:
  - Admin login, admin self-registration, and first super-admin setup from Admin screen
  - Create, edit, update, and delete lyrics based on permissions
  - Super admin can promote/manage other admins and privileges

## Tech Stack

- Expo React Native (TypeScript)
- Supabase (Auth + Postgres + RLS)
- React Navigation (Drawer)
- AsyncStorage for offline cache and local preferences

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Set Supabase keys in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OWNER_EMAIL` (email allowed to initialize first super admin)

4. In Supabase SQL Editor, run:

- `supabase-schema.sql`

5. Create your first super admin:

- Open Admin Panel in the app.
- Choose `1ኛ ሱፐር አድሚን`.
- Register using the same email configured in `EXPO_PUBLIC_OWNER_EMAIL`.
- The app calls `bootstrap_super_admin()` once and grants full super-admin permissions.

6. Register other admins:

- They choose `ተመዝገብ` in Admin Panel.
- Their account becomes `pending_admin`.
- Super admin opens `አድሚኖች` tab and promotes them to `admin` with selected permissions.

7. Start app:

```bash
npm run start
```

## Main App Screens

- Home
- About
- Services
- Lyrics
- Admin Panel

## Important Notes

- The app allows public lyric reading without authentication.
- Admin operations are protected by role + permission checks.
- New admin accounts are pending by default until super admin approval.
- Lyrics are cached locally and shown offline; pull-to-refresh syncs latest data.
- Likes are tracked with a device id and persisted locally + in `lyric_likes` table.

## Suggested Supabase Tables

- `profiles`
- `lyrics`
- `lyric_likes`

All are defined in `supabase-schema.sql` with RLS policies and triggers.
