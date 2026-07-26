import seed from "@/german-a2-course-data.json";
import type {
  Course,
  CourseModule,
  CourseProgress,
  DailyTargetMinutes,
  ProgressSnapshot,
  TaskProgress,
} from "@/lib/types";

type SeedModule = Omit<CourseModule, "tasks"> & { tasks: string[] };

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export const todayKey = () => localDate();

export const course: Course = {
  ...seed.course,
  dailyPlans: seed.dailyPlans as unknown as Record<DailyTargetMinutes, string[]>,
  weeklyRoutine: seed.weeklyRoutine,
  materials: seed.materials,
  modules: (seed.modules as SeedModule[]).map((module) => ({
    ...module,
    tasks: module.tasks.map((title, index) => ({
      id: `${module.id}-task-${String(index + 1).padStart(2, "0")}`,
      title,
      moduleId: module.id,
      completed: false,
    })),
  })),
};

export const allTasks = course.modules.flatMap((module) => module.tasks);

export function createDefaultProgress(): CourseProgress {
  return {
    version: 1,
    startDate: todayKey(),
    dailyTargetMinutes: 90,
    theme: "light",
    autoSave: true,
    lockMode: false,
    tasks: Object.fromEntries(
      allTasks.map((task) => [task.id, { completed: false } satisfies TaskProgress]),
    ),
    moduleNotes: {},
    expandedModuleIds: ["T0"],
    studyLogs: [],
    todayActivities: {},
    readNotificationIds: [],
  };
}

export function mergeProgress(value: unknown): CourseProgress {
  const defaults = createDefaultProgress();
  if (!value || typeof value !== "object") return defaults;
  const imported = value as Partial<CourseProgress>;
  const target = [60, 90, 120].includes(Number(imported.dailyTargetMinutes))
    ? (Number(imported.dailyTargetMinutes) as DailyTargetMinutes)
    : defaults.dailyTargetMinutes;

  return {
    ...defaults,
    ...imported,
    version: 1,
    startDate:
      typeof imported.startDate === "string" ? imported.startDate : defaults.startDate,
    dailyTargetMinutes: target,
    theme: imported.theme === "dark" ? "dark" : "light",
    autoSave: imported.autoSave !== false,
    lockMode: imported.lockMode === true,
    tasks: Object.fromEntries(
      allTasks.map((task) => {
        const saved = imported.tasks?.[task.id];
        return [
          task.id,
          saved && typeof saved === "object"
            ? { ...defaults.tasks[task.id], ...saved }
            : defaults.tasks[task.id],
        ];
      }),
    ),
    moduleNotes:
      imported.moduleNotes && typeof imported.moduleNotes === "object"
        ? imported.moduleNotes
        : {},
    expandedModuleIds: Array.isArray(imported.expandedModuleIds)
      ? imported.expandedModuleIds.filter((id): id is string => typeof id === "string")
      : defaults.expandedModuleIds,
    studyLogs: Array.isArray(imported.studyLogs)
      ? imported.studyLogs.filter(
          (log) =>
            log &&
            typeof log.id === "string" &&
            typeof log.date === "string" &&
            Number(log.minutes) > 0,
        )
      : [],
    todayActivities:
      imported.todayActivities && typeof imported.todayActivities === "object"
        ? imported.todayActivities
        : {},
    readNotificationIds: Array.isArray(imported.readNotificationIds)
      ? imported.readNotificationIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  };
}

export function getModuleProgress(module: CourseModule, progress: CourseProgress) {
  const completed = module.tasks.filter(
    (task) => progress.tasks[task.id]?.completed,
  ).length;
  return {
    completed,
    total: module.tasks.length,
    percent: module.tasks.length
      ? Math.round((completed / module.tasks.length) * 100)
      : 0,
  };
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function activeDateKeys(progress: CourseProgress) {
  const keys = new Set(progress.studyLogs.map((log) => log.date));
  Object.values(progress.tasks).forEach((task) => {
    if (task.completedAt) keys.add(localDate(new Date(task.completedAt)));
  });
  return keys;
}

function calculateStreaks(progress: CourseProgress) {
  const active = activeDateKeys(progress);
  if (!active.size) return { current: 0, longest: 0 };

  const sorted = [...active].sort();
  const first = dateFromKey(sorted[0]);
  const last = dateFromKey(todayKey());
  let longest = 0;
  let running = 0;
  for (let cursor = first; cursor <= last; cursor = addDays(cursor, 1)) {
    if (cursor.getDay() === 0) continue;
    if (active.has(localDate(cursor))) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  let cursor = dateFromKey(todayKey());
  if (cursor.getDay() === 0) cursor = addDays(cursor, -1);
  if (!active.has(localDate(cursor))) {
    cursor = addDays(cursor, -1);
    if (cursor.getDay() === 0) cursor = addDays(cursor, -1);
  }
  while (active.has(localDate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
    if (cursor.getDay() === 0) cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function getProgressSnapshot(progress: CourseProgress): ProgressSnapshot {
  const completedTasks = allTasks.filter(
    (task) => progress.tasks[task.id]?.completed,
  ).length;
  const totalTasks = allTasks.length;
  const coursePercent = Math.round((completedTasks / totalTasks) * 100);
  const taskMinutes = Object.values(progress.tasks).reduce(
    (total, task) => total + (Number(task.minutesSpent) || 0),
    0,
  );
  const loggedStudyMinutes =
    taskMinutes +
    progress.studyLogs.reduce((total, log) => total + Number(log.minutes || 0), 0);
  const studyPercent = Math.min(
    100,
    Math.round((loggedStudyMinutes / (course.targetHours * 60)) * 100),
  );
  const currentModule =
    course.modules.find((module) => getModuleProgress(module, progress).percent < 100) ??
    course.modules.at(-1)!;

  const elapsedDays = Math.max(
    0,
    Math.floor(
      (dateFromKey(todayKey()).getTime() -
        dateFromKey(progress.startDate).getTime()) /
        86_400_000,
    ),
  );
  const currentWeek = Math.min(
    course.durationWeeks,
    Math.max(1, Math.floor(elapsedDays / 7) + 1),
  );
  const expectedPercent = Math.min(
    100,
    (elapsedDays / (course.durationWeeks * 7)) * 100,
  );
  const delta = coursePercent - expectedPercent;
  const status =
    delta >= 8
      ? "Ahead of plan"
      : delta >= -6
        ? "On track"
        : delta >= -15
          ? "Slightly behind"
          : "Needs attention";
  const streaks = calculateStreaks(progress);

  return {
    completedTasks,
    totalTasks,
    coursePercent,
    loggedStudyMinutes,
    studyPercent,
    currentModule,
    currentWeek,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    status,
  };
}

export function formatHours(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function isTestTask(title: string) {
  return /test|score|exam/i.test(title);
}

export function taskCategory(title: string) {
  if (/vocab|word/i.test(title)) return "Vocabulary";
  if (/write|email|message|invitation|cancellation|form|dialogue/i.test(title))
    return "Writing";
  if (/speak|speaking|pronunciation|record|practise.*(?:asking|ordering|call)/i.test(title))
    return "Speaking";
  if (isTestTask(title)) return "Tests";
  return "Coursework";
}
