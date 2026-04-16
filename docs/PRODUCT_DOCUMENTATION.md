# Johanan Choir Application Product Documentation

Last updated: 2026-04-16

## 1) Product Requirements Document (PRD)

### 1.1 Product name
Johanan Choir Lyrics and Gallery Application

### 1.2 Product vision
Build a mobile-first, Amharic-first choir platform that lets anyone browse and engage with choir lyrics and media, while enabling authorized admins to manage lyrics, members, memories, branding, and application content from inside the app.

### 1.3 Problem statement
Choir content (lyrics, members, memories, and announcements) is often scattered across chat threads, notebooks, and personal devices. This creates issues with discoverability, consistency, and continuity when leaders or members change.

### 1.4 Goals
- Provide fast, public access to choir lyrics without requiring login.
- Support offline-first lyric reading and local personalization.
- Provide role-based admin workflows for content and system management.
- Support choir identity and communication through branding, about/services content, and contact workflows.
- Preserve choir history with member and memory galleries.

### 1.5 Non-goals (current phase)
- Real-time collaborative editing.
- Payments, subscriptions, or monetization.
- Complex analytics dashboards beyond aggregate counts.
- End-user account system for public users.

### 1.6 Target users
- Public choir audience: read, search, like, and favorite lyrics; browse gallery.
- Choir admins: maintain lyrics and selected settings.
- Super admin: full governance of admins, receivers, global settings, and controlled options.

### 1.7 Core user stories
- As a public user, I can open the app and read lyrics immediately.
- As a public user, I can search lyrics by title/content and filter by scale and rhythm.
- As a public user, I can like and favorite lyrics, and keep using cached data when offline.
- As an admin, I can create, edit, and delete lyrics (including optional audio attachment).
- As a super admin, I can approve/manage admins and permission assignments.
- As a super admin/admin, I can update app page text, developer info, branding assets, and security password.
- As a public user, I can submit contact messages and target active receivers.
- As a user, I can browse choir members and choir memories, and save/favorite media locally.

### 1.8 Functional requirements

#### FR-1 Public app access
- The app supports access without authentication for most read workflows.
- The app is protected by an app-level password gate before content is shown.

#### FR-2 Lyrics discovery and engagement
- List lyrics with sorting by number/newest/oldest.
- Search with normalized token matching across title/content/number.
- Filter by scale and rhythm.
- Like/unlike lyrics using device-based tracking.
- Favorite/unfavorite lyrics locally.
- Open a detail view for full lyric content.

#### FR-3 Lyrics media and export
- Play lyric audio where available.
- Upload lyric audio from admin flow.
- Export lyrics to supported formats and share/print from client.

#### FR-4 Offline resilience
- Cache lyrics locally and use cache fallback when network/supabase query fails.
- Preserve likes/favorites and key settings locally.

#### FR-5 Admin authentication and authorization
- Admin sign in and sign up available in admin flow.
- Owner email based first super-admin bootstrap.
- Role model: pending_admin, admin, super_admin.
- Permission model supports granular actions and super-admin override.

#### FR-6 Admin content management
- Lyrics CRUD (title, content, number, transpose, scale, rhythm, audio_url).
- Music category management (scale/rhythm options).
- Member option management (member category, education, marital status, occupation).
- Choir member CRUD including photo upload and profile fields.
- Choir memory CRUD including photo upload and metadata.

#### FR-7 App customization and governance
- Editable page content (home/about/services/copyright) with language-aware variants.
- Editable developer profile and social links.
- Editable app branding (background, logo, choir title).
- Editable app security password.
- Editable text style settings for pages and lyrics.
- Contact receiver management with approval and active status.

#### FR-8 Contact workflow
- User can submit contact message (message + lyric suggestion + spelling report).
- Message is stored in backend and associated with target receiver(s).
- User can optionally open external email client prefilled with recipients and content.

### 1.9 Non-functional requirements
- Platform: React Native via Expo, Android-first with web support available.
- Performance: fast perceived load via cache-first lyric loading.
- Reliability: fallback behaviors for settings/category fetch failures.
- Security: Supabase RLS on data tables and storage buckets.
- Maintainability: TypeScript typing across domain models and services.
- Localization: Amharic and English language toggling for UI content.

### 1.10 Success metrics (recommended)
- Time-to-first-lyric visible under 2s when cache exists.
- Search-to-open action completion rate above 90%.
- Daily active lyric readers and average lyrics opened per session.
- Admin content freshness: median time from request to content update.
- Contact form delivery success rate.

### 1.11 Risks and dependencies
- Supabase availability and correct env configuration are critical.
- Storage bucket policies must remain aligned with role model.
- Device-local likes/favorites can diverge from backend in offline/partial-failure scenarios.
- App-level password is broad access control, not per-user identity.

### 1.12 Release scope suggestion
- Phase A (already delivered): public lyrics core + admin core + settings + members/memories.
- Phase B: richer analytics, moderation workflows, and better error telemetry.
- Phase C: optional user accounts and personalization sync across devices.

## 2) What Has Been Done So Far (Implementation Status)

Status date: 2026-04-16

### 2.1 Overall completion summary
- Core mobile app shell is implemented with navigation, theming, language support, and access gate.
- Public-facing lyric browsing workflow is implemented end-to-end.
- Admin management surface is implemented with broad feature coverage.
- Supabase schema includes major application entities, RLS policies, and storage bucket policies.

### 2.2 Implemented application layers

#### App shell and navigation
- Global providers: theme, language, auth.
- Drawer-based navigation with custom animated drawer content.
- App-level password gate before app content access.
- Status bar theme adaptation.

#### Public screens implemented
- Home screen with:
  - Dynamic page content
  - Lyrics analytics counters
  - Choir member and memory gallery views
  - Local favorite/saved media toggles
  - Photo download support (platform-aware)
- Lyrics screen with:
  - Cache-first loading + refresh
  - Advanced text search normalization and ranking
  - Scale/rhythm filter options from backend categories
  - Like/favorite interactions
  - Audio playback for lyric tracks
  - Export/share/print actions
- Additional content screens:
  - About
  - Services
  - Favorites
  - Photo Favorites
  - Photo Saved
  - Contact
  - Developer
  - Share App

#### Admin flow implemented
- Admin gateway and login screens.
- Admin dashboard supports major modes:
  - Lyrics create/edit/delete
  - Admin listing and role/permission management
  - Settings management
  - Statistics
  - Choir members and choir memories management

### 2.3 Implemented backend/service capabilities

#### Authentication and role handling
- Supabase session tracking and profile loading.
- Owner email fallback profile handling.
- First super-admin bootstrap RPC path.
- Permission helper for feature checks.

#### Lyrics domain
- Fetch from Supabase and persist local cache.
- Filter/sort utilities and analytics aggregation.
- Like and favorite local state with server upsert for likes.
- Lyrics CRUD and audio upload to public storage bucket.

#### Choir members and memories domain
- CRUD services for members and memories.
- Photo uploads for both domains.

#### Settings and configuration domain
- Page content settings (including language-aware loading/saving).
- Developer profile and social links.
- App access password setting.
- Branding settings and branding image upload.
- Text style settings for page and lyrics contexts.

#### Contact domain
- Fetch active recipients.
- Submit contact messages with selected target receiver.
- Receiver management (add/update/delete, activation/approval state).

#### Option/category management
- Dynamic music categories (scale/rhythm) with add/update/deactivate.
- Dynamic member options (member category/education/marital/occupation) with add/update/deactivate.

### 2.4 Database and security implementation status
- Database schema includes:
  - profiles, lyrics, lyric_likes
  - app settings/content/developer/security/branding tables
  - contact_messages and app_contact_receivers
  - choir_members and choir_memories
  - music_categories and member_options
- Trigger and function coverage includes:
  - updated_at automation
  - profile bootstrap helpers
  - first super-admin bootstrap
  - lyric likes count synchronization
- RLS policies exist for read/write segmentation across public, authenticated, admin, and super-admin scenarios.
- Storage buckets and related object policies are configured for choir member photos, choir memories, and lyric audio.

### 2.5 Delivered technical stack
- Expo + React Native + TypeScript app scaffold.
- React Navigation drawer architecture.
- Supabase client integration for auth, postgres, storage, and RPC.
- AsyncStorage persistence for cache and local collections.

### 2.6 Remaining work and known gaps (recommended backlog)
- Add automated test coverage (unit/integration/e2e) for core services and critical screens.
- Add stronger analytics and monitoring (client errors, failed syncs, key user flows).
- Add migration/versioning notes and environment setup hardening for multi-env deployments.
- Improve conflict handling between offline local state and server truth for likes/favorites and content freshness.
- Add explicit product acceptance criteria checklist per feature area for release gating.

## 3) Suggested Next Documentation Artifacts
- Architecture decision records (auth model, cache strategy, role/permission strategy).
- API and RPC contract documentation (input/output/error behavior).
- QA test plan with regression matrix by screen and role.
- Admin operations manual for content editors and super-admin governance.
