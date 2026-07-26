# Codex Project Brief: German A2 Progress Tracker

## 1. Project goal

Build a beautiful, motivating, iPad-first web application that helps me complete German A2 in 12 weeks. I will study 1-2 hours per day, six days per week, with Sunday as a rest day. The application should feel similar to a polished project tracker such as Motrix: expandable phases, task checkboxes, visible progress, milestones and clean project-management structure.

The app is for personal use. It should be simple enough that I can open it on my iPad every day and immediately see what I need to study next.

Use the attached file `german-a2-course-data.json` as the initial course data.

## 2. Preferred technical approach

Create the project with:

- React
- TypeScript
- Tailwind CSS
- A lightweight modern build tool or framework
- Local persistence using localStorage or IndexedDB
- No backend and no login for version 1
- PWA support so it can be added to the iPad home screen and opened like an app

Use clean, maintainable components and strongly typed data models. Avoid unnecessary dependencies.

## 3. Core experience

When the app opens, I should immediately see:

- Overall A2 completion percentage
- Current week and current module
- Number of completed tasks and total tasks
- Target study hours: 108 hours
- Logged study hours
- Today’s suggested study plan
- Current learning streak
- Next milestone or revision gate
- A motivational message that changes occasionally

The app should help me answer three questions instantly:

1. What should I study today?
2. How much have I completed?
3. Am I on track to finish within 12 weeks?

## 4. iPad-first UI requirements

Design primarily for iPad Safari in portrait and landscape modes, while remaining usable on desktop and mobile.

Requirements:

- Responsive from approximately 768 px upward, with graceful mobile support
- Large touch targets of at least 44 x 44 px
- No important action should depend on hover
- Use a collapsible left navigation panel in landscape mode
- Use a bottom navigation bar or slide-out drawer in portrait mode
- Keep primary controls reachable with one hand
- Support both touch and keyboard interaction
- Avoid tiny checkboxes, dense tables and cramped text
- Use smooth but subtle transitions
- Use readable typography and generous spacing
- Respect reduced-motion preferences
- Prevent accidental task resets with confirmation dialogs
- Use sticky progress/navigation elements only when they do not reduce usable screen space

## 5. Visual direction

Create a calm, premium and motivating learning dashboard.

Suggested visual language:

- Light background with soft gradients
- Deep navy or charcoal for strong text
- Warm orange as the main progress/accent colour
- Teal or green for completed tasks
- Rounded cards
- Soft shadows
- Clear section hierarchy
- Simple line icons
- A large progress ring or progress bar on the dashboard
- Weekly cards that feel like stages in a journey

The design should feel polished, friendly and focused rather than childish. Avoid excessive animation, neon colours or a gamified appearance that feels distracting.

## 6. Main pages and views

### A. Dashboard

Include:

- Overall progress ring
- Course title: German A2 in 12 Weeks
- Current week card
- Today’s tasks
- Study-time progress against the 108-hour target
- Weekly completion chart
- Current streak
- Next revision gate
- Quick actions: Continue learning, Log study time, Open materials

### B. Course roadmap

Display T0 to T12 as expandable phases.

Each phase should show:

- Module ID
- Week number
- Module title
- Estimated hours
- Completion percentage
- Topics
- Grammar points
- Materials
- Individual tasks with checkboxes

The user should be able to expand or collapse each module. The current module should be highlighted. Completed modules should show a clear completion badge.

### C. Today view

Generate a simple daily plan based on the selected study duration:

- 60 minutes
- 90 minutes
- 120 minutes

Allow the user to select their available time for the day. Show the matching study breakdown from the JSON data. Let the user mark each activity complete.

### D. Materials library

Show the four learning resources from the JSON file as cards:

- VHS-Lernportal A2
- Nicos Weg A2
- Goethe A2 practice materials
- Schritte plus Neu A2

Each card should show purpose, type and an Open resource button. External links should open safely in a new tab.

### E. Progress and statistics

Include:

- Overall task completion
- Module-by-module progress
- Logged study hours
- Planned versus completed hours
- Vocabulary task completion
- Writing task completion
- Speaking task completion
- Practice-test scores
- Current streak and longest streak

Use simple charts that remain easy to read on an iPad. Do not overload the page.

### F. Settings and data management

Include:

- Light mode and dark mode
- Change daily target: 60, 90 or 120 minutes
- Change start date
- Export progress as JSON
- Import progress from JSON
- Reset all progress with a confirmation step
- Optional lock mode that prevents accidental editing

## 7. Task behaviour

Each task should support:

- Complete/incomplete status
- Completion date
- Optional note
- Optional time spent
- Optional score for tests

When a task is checked:

- Update the module progress
- Update overall progress
- Update today’s progress
- Save immediately to local persistence
- Show a subtle success animation or confirmation

When all tasks in a module are complete, mark the module complete and display a short congratulatory message.

## 8. Progress rules

Calculate:

- Task progress = completed tasks / total tasks
- Module progress = completed tasks in module / total tasks in module
- Course progress = completed tasks across all modules / all course tasks
- Study-hour progress = logged hours / 108 target hours
- On-track status based on elapsed course days and completed course percentage

Show status labels such as:

- Ahead of plan
- On track
- Slightly behind
- Needs attention

Use supportive wording rather than negative or judgmental wording.

## 9. Data model

Create clear TypeScript interfaces similar to:

```ts
interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  usage: string;
}

interface CourseTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  note?: string;
  minutesSpent?: number;
  score?: number;
}

interface CourseModule {
  id: string;
  title: string;
  week: number;
  estimatedHours: number;
  topics: string[];
  grammar: string[];
  tasks: CourseTask[];
  materials: string[];
}

interface CourseProgress {
  startDate: string;
  dailyTargetMinutes: 60 | 90 | 120;
  loggedStudyMinutes: number;
  currentStreak: number;
  longestStreak: number;
  taskProgress: Record<string, CourseTask>;
}
```

Create stable IDs for all tasks during initial data transformation.

## 10. Persistence

Persist the following locally:

- Task status
- Notes
- Time spent
- Test scores
- Start date
- Daily study target
- Theme preference
- Study logs
- Streak information

The user’s progress must survive browser refreshes and reopening the app.

Implement export/import so the user can back up progress or move it to another device.

## 11. Accessibility

- Use semantic HTML
- Provide visible focus states
- Add accessible labels to icon-only buttons
- Ensure sufficient colour contrast
- Do not use colour alone to communicate completion
- Make expandable sections usable with keyboard and screen readers
- Use clear status text alongside charts

## 12. Suggested component structure

Create reusable components such as:

- `AppShell`
- `SidebarNavigation`
- `BottomNavigation`
- `DashboardHeader`
- `ProgressRing`
- `CurrentWeekCard`
- `TodayPlanCard`
- `ModuleAccordion`
- `ModuleCard`
- `TaskRow`
- `MaterialCard`
- `StudyTimer`
- `StudyLogDialog`
- `ProgressChart`
- `MilestoneCard`
- `ImportExportPanel`
- `ResetProgressDialog`

## 13. Suggested routes

Use routes such as:

- `/` – Dashboard
- `/roadmap` – Full course roadmap
- `/today` – Today’s study plan
- `/materials` – Learning resources
- `/progress` – Statistics
- `/settings` – Preferences and data management

A single-page implementation is also acceptable if the navigation and state remain clear.

## 14. Important UX details

- Remember which modules were expanded
- Allow one-tap completion of tasks
- Show module progress even when collapsed
- Highlight overdue or incomplete weekly tasks gently
- Add a Continue button that scrolls directly to the next incomplete task
- Add a filter for All, Current, Incomplete and Completed modules
- Add a search field for topics, grammar and tasks
- Make the materials linked to each module easily accessible
- Let the user add a small personal note to each module
- Display exact progress values as well as visuals

## 15. Optional enhancements after the core app works

Only implement these after all core requirements work correctly:

- Installable PWA
- Offline caching
- Daily reminder notifications where browser support allows
- Study timer
- Confetti only when a full module is completed, with reduced-motion support
- Calendar heatmap
- Custom tasks
- German-language UI toggle

## 16. Seed data

Load all course content from `german-a2-course-data.json`. Do not hardcode the full course repeatedly across components.

On first launch:

1. Load the JSON seed data.
2. Generate stable task IDs.
3. Initialise all tasks as incomplete.
4. Save only user progress separately from the original course content.

This makes future course-content updates easier without destroying progress.

## 17. Quality expectations

The final project must:

- Run without console errors
- Be fully usable on iPad Safari
- Preserve progress after refresh
- Support portrait and landscape layouts
- Have no horizontal scrolling on standard iPad widths
- Have working import and export
- Have confirmation before reset
- Calculate all progress values correctly
- Include a polished empty state and completed state
- Include a README with setup, run and build instructions

## 18. Testing checklist

Test at least these scenarios:

1. Complete and uncomplete a task.
2. Refresh the browser and confirm progress remains.
3. Complete an entire module.
4. Change the daily target from 60 to 90 minutes.
5. Log study time.
6. Export progress, reset, then import the backup.
7. Open in iPad portrait width.
8. Open in iPad landscape width.
9. Navigate using touch only.
10. Verify there is no horizontal overflow.
11. Verify dark mode remains after refresh.
12. Verify reduced-motion support.

## 19. Deliverables

Create:

- Complete source code
- Responsive iPad-first UI
- Seed-data loader for `german-a2-course-data.json`
- Local persistence
- Import/export functionality
- README with setup instructions
- Clean file structure
- A short explanation of the architecture

## 20. Working style for Codex

Do not stop at a visual mock-up. Build a working application.

Proceed in this order:

1. Set up the project.
2. Define TypeScript models.
3. Load and normalise the course JSON.
4. Add persistence.
5. Build the roadmap and task interactions.
6. Build the dashboard.
7. Add today, materials, progress and settings views.
8. Polish iPad responsiveness and accessibility.
9. Add import/export and reset.
10. Run tests and fix issues.

Make sensible design decisions without asking unnecessary questions. Keep the implementation simple, reliable and easy to extend.
