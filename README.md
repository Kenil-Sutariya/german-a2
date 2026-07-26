# German A2 in 12 Weeks

A complete, iPad-first German A2 learning tracker built with React, TypeScript,
Tailwind CSS and the vinext/Vite toolchain. The application uses
`german-a2-course-data.json` as immutable seed content and stores only personal
progress in the browser.

## Features

- Dashboard with overall progress, current module, study hours, streak and next
  revision gate
- A personalized experience for Nency (“Chakudiiii”) with encouraging milestones,
  a dedicated note and persistent in-app learning notifications
- Expandable T0–T12 roadmap with task completion, notes, time spent and test
  scores
- Adaptive 60, 90 or 120-minute daily study plans
- Materials library with module-aware deep links to the exact current grammar,
  vocabulary or exam-practice topic, plus all four seeded learning resources
- Module, skill and practice-test statistics
- Local persistence with auto-save enabled by default and a manual-save mode
- Dark mode, editing lock, JSON backup/import and confirmed reset
- Installable PWA shell with offline fallback
- Responsive iPad portrait/landscape navigation and mobile support

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed in the terminal.

## Build and test

```bash
npm run build
npm test
```

## Architecture

- `german-a2-course-data.json` — canonical course content
- `lib/types.ts` — strongly typed course and progress models
- `lib/course.ts` — seed normalization, stable task IDs and progress calculations
- `lib/focus-resources.ts` — curated topic links for every module from T0 to T12
- `app/GermanTrackerApp.tsx` — application shell, views and interactions
- `app/globals.css` — responsive design system and accessibility states
- `public/manifest.webmanifest` and `public/sw.js` — PWA metadata and offline shell

Progress is stored under `german-a2-progress-v1` in `localStorage`. Course data
is never overwritten, so seed updates can be shipped without erasing existing
task progress.

## Universal cloud sync on Vercel

The app includes an optional Supabase integration. It keeps a local copy for
offline use, then securely syncs the signed-in learner’s progress to a private
cloud record. This means Nency can sign in on a phone, iPad or laptop and see
the same course progress.

### 1. Create the database

1. Create a free [Supabase project](https://supabase.com/dashboard).
2. Open **SQL Editor** and run the complete contents of
   [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Authentication → Providers**, leave Email enabled. For the simplest
   first setup, disable email confirmation; otherwise Nency must confirm her
   account email before the first sign-in.

The SQL enables Row Level Security: a signed-in learner can read and write only
their own progress record. Never use the Supabase `service_role` key in Vercel
or in the browser.

### 2. Add the Vercel environment variables

1. In Supabase, open **Project Settings → API**.
2. Copy the project URL and the anon/publishable key.
3. In Vercel, open this project’s **Settings → Environment Variables** and add:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Apply them to Production, Preview and Development, then redeploy.

Use [`.env.example`](./.env.example) as the local template. Do not commit a
real `.env.local` file.

### 3. Turn it on in the app

After Vercel redeploys, open **Settings → Cloud sync** in the tracker. Create a
learner account for Nency with her email and a password of at least six
characters, then sign in. With auto-save enabled (the default), each change is
saved both on the device and to the cloud. The **Sync now** button is available
for an immediate manual sync.

### Files added for cloud sync

- `lib/cloud-sync.ts` — browser-safe Supabase Auth and database calls, with no
  service-role secret.
- `supabase/schema.sql` — database table and private Row Level Security rules.
- `.env.example` — the two required Vercel environment variable names.
