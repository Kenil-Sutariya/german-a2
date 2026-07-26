export type DailyTargetMinutes = 60 | 90 | 120;
export type ThemePreference = "light" | "dark";
export type ViewId =
  | "dashboard"
  | "roadmap"
  | "today"
  | "materials"
  | "progress"
  | "settings";

export interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  usage: string;
}

export interface CourseTask {
  id: string;
  title: string;
  moduleId: string;
  completed: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  week: number;
  estimatedHours: number;
  topics: string[];
  grammar: string[];
  tasks: CourseTask[];
  materials: string[];
}

export interface Course {
  title: string;
  subtitle: string;
  durationWeeks: number;
  studyDaysPerWeek: number;
  targetHours: number;
  minimumDailyMinutes: number;
  recommendedDailyMinutes: number;
  maximumDailyMinutes: number;
  restDay: string;
  completionCriteria: string[];
  dailyPlans: Record<DailyTargetMinutes, string[]>;
  weeklyRoutine: { day: string; focus: string }[];
  materials: Material[];
  modules: CourseModule[];
}

export interface TaskProgress {
  completed: boolean;
  completedAt?: string;
  note?: string;
  minutesSpent?: number;
  score?: number;
}

export interface StudyLog {
  id: string;
  date: string;
  minutes: number;
  note?: string;
}

export interface CourseProgress {
  version: 1;
  startDate: string;
  dailyTargetMinutes: DailyTargetMinutes;
  theme: ThemePreference;
  autoSave: boolean;
  lockMode: boolean;
  tasks: Record<string, TaskProgress>;
  moduleNotes: Record<string, string>;
  expandedModuleIds: string[];
  studyLogs: StudyLog[];
  todayActivities: Record<string, string[]>;
  readNotificationIds: string[];
  lastSavedAt?: string;
}

export interface ProgressSnapshot {
  completedTasks: number;
  totalTasks: number;
  coursePercent: number;
  loggedStudyMinutes: number;
  studyPercent: number;
  currentModule: CourseModule;
  currentWeek: number;
  currentStreak: number;
  longestStreak: number;
  status: "Ahead of plan" | "On track" | "Slightly behind" | "Needs attention";
}
