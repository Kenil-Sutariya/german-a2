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
