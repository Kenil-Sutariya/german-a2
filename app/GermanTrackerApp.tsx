"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  allTasks,
  course,
  createDefaultProgress,
  formatHours,
  getModuleProgress,
  getProgressSnapshot,
  isTestTask,
  mergeProgress,
  taskCategory,
  todayKey,
} from "@/lib/course";
import { focusResources } from "@/lib/focus-resources";
import {
  clearCloudSession,
  isCloudSyncConfigured,
  loadCloudProgress,
  readCloudSession,
  refreshCloudSession,
  saveCloudProgress,
  signInToCloud,
  signOutOfCloud,
  signUpForCloud,
  type CloudSession,
} from "@/lib/cloud-sync";
import type {
  CourseModule,
  CourseProgress,
  CourseTask,
  DailyTargetMinutes,
  StudyLog,
  TaskProgress,
  ViewId,
} from "@/lib/types";

const STORAGE_KEY = "german-a2-progress-v1";
const MOTIVATIONS = [
  "Chakudiiii, every small session is a quiet promise to your future self.",
  "Nency, today’s practice is tomorrow’s confidence.",
  "Keep your lovely rhythm, Chakudiiii—clarity arrives through repetition.",
  "You do not need a perfect session, only one brave little step.",
  "Ein Schritt nach dem anderen—you’ve got this, Nency.",
];

const HEART_PARTICLES = Array.from({ length: 36 }, (_, index) => ({
  left: 4 + ((index * 29) % 93),
  top: 4 + ((index * 47) % 88),
  size: 15 + ((index * 7) % 24),
  delay: (index * 43) % 430,
  drift: -36 + ((index * 19) % 73),
  rotation: -32 + ((index * 23) % 65),
}));

interface LearningNotification {
  id: string;
  title: string;
  message: string;
  tone: "orange" | "teal" | "blue";
}

const NAV_ITEMS: { id: ViewId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Home", icon: "⌂" },
  { id: "roadmap", label: "Roadmap", icon: "◇" },
  { id: "today", label: "Today", icon: "◷" },
  { id: "materials", label: "Materials", icon: "▤" },
  { id: "progress", label: "Progress", icon: "↗" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function viewFromHash(): ViewId {
  if (typeof window === "undefined") return "dashboard";
  const value = window.location.hash.replace("#/", "") as ViewId;
  return NAV_ITEMS.some((item) => item.id === value) ? value : "dashboard";
}

function firstIncompleteTask(module: CourseModule, progress: CourseProgress) {
  return module.tasks.find((task) => !progress.tasks[task.id]?.completed);
}

function buildLearningNotifications(
  progress: CourseProgress,
): LearningNotification[] {
  const snapshot = getProgressSnapshot(progress);
  const nextTask = firstIncompleteTask(snapshot.currentModule, progress);
  const paceMessage =
    snapshot.status === "Ahead of plan"
      ? "You are ahead, Nency. Enjoy that win and keep today’s session gentle."
      : snapshot.status === "On track"
        ? `You are right on track. A focused ${progress.dailyTargetMinutes}-minute session is enough for today.`
        : "No pressure, Chakudiiii. One completed task today is a beautiful restart.";

  return [
    {
      id: "welcome-nency",
      title: "Made especially for you, Chakudiiii ✦",
      message:
        "This A2 journey was put together with care for Nency. One calm step at a time—you never have to rush.",
      tone: "orange",
    },
    {
      id: `next-${snapshot.currentModule.id}`,
      title: "Your next tiny win",
      message: nextTask
        ? `${snapshot.currentModule.id}: ${nextTask.title}`
        : `${snapshot.currentModule.id} is complete. Take a moment to be proud before moving on.`,
      tone: "teal",
    },
    {
      id: `pace-${snapshot.status}`,
      title: `${snapshot.status}, Nency`,
      message: paceMessage,
      tone: "blue",
    },
  ];
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function ProgressRing({
  value,
  size = "large",
}: {
  value: number;
  size?: "large" | "small";
}) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`progress-ring progress-ring--${size} ${
        safeValue === 0 ? "progress-ring--empty" : ""
      }`}
      style={{ "--progress": `${safeValue * 3.6}deg` } as React.CSSProperties}
      role="img"
      aria-label={`${safeValue}% complete`}
    >
      <div className="progress-ring__inner">
        <strong>{safeValue}%</strong>
        <span>complete</span>
      </div>
    </div>
  );
}

function MiniProgress({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="mini-progress">
      <div className="mini-progress__labels">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "orange" | "teal" | "blue";
}) {
  return (
    <article className={`stat-card ${tone ? `stat-card--${tone}` : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function Dashboard({
  progress,
  onNavigate,
  onContinue,
  onLogTime,
}: {
  progress: CourseProgress;
  onNavigate: (view: ViewId) => void;
  onContinue: () => void;
  onLogTime: () => void;
}) {
  const [heartBurstId, setHeartBurstId] = useState(0);
  const snapshot = getProgressSnapshot(progress);
  const currentProgress = getModuleProgress(snapshot.currentModule, progress);
  const todayTasks = snapshot.currentModule.tasks
    .filter((task) => !progress.tasks[task.id]?.completed)
    .slice(0, 3);
  const milestones = ["T4", "T8", "T12"]
    .map((id) => course.modules.find((module) => module.id === id)!)
    .filter(Boolean);
  const nextMilestone =
    milestones.find((module) => getModuleProgress(module, progress).percent < 100) ??
    milestones.at(-1)!;
  const motivation =
    MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

  useEffect(() => {
    if (!heartBurstId) return;
    const timer = window.setTimeout(() => setHeartBurstId(0), 1900);
    return () => window.clearTimeout(timer);
  }, [heartBurstId]);

  return (
    <div className="view">
      <PageHeader
        eyebrow={`Week ${snapshot.currentWeek} of ${course.durationWeeks}`}
        title="Guten Tag, Chakudiiii — ready for a focused session?"
        description={motivation}
        action={
          <div className={`status-pill status-pill--${snapshot.status.toLowerCase().replaceAll(" ", "-")}`}>
            <span aria-hidden="true">●</span>
            {snapshot.status}
          </div>
        }
      />

      <section className="hero-grid" aria-label="Course overview">
        <article className="hero-progress card">
          <ProgressRing value={snapshot.coursePercent} />
          <div className="hero-progress__copy">
            <p className="eyebrow">Overall A2 progress</p>
            <h2>{course.title}</h2>
            <p>
              {snapshot.completedTasks} of {snapshot.totalTasks} tasks completed
            </p>
            <div className="hero-actions">
              <button className="button button--primary" onClick={onContinue}>
                Continue learning <span aria-hidden="true">→</span>
              </button>
              <button className="button button--secondary" onClick={onLogTime}>
                <span aria-hidden="true">＋</span> Log study time
              </button>
            </div>
          </div>
        </article>

        <article className="current-module card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Current module</p>
              <h2>
                {snapshot.currentModule.id} · {snapshot.currentModule.title}
              </h2>
            </div>
            <span className="week-chip">
              {snapshot.currentModule.week === 0
                ? "Setup"
                : `Week ${snapshot.currentModule.week}`}
            </span>
          </div>
          <MiniProgress
            value={currentProgress.percent}
            label={`${currentProgress.completed}/${currentProgress.total} tasks`}
          />
          <div className="topic-row">
            {snapshot.currentModule.topics.slice(0, 3).map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("roadmap")}
          >
            View module details <span aria-hidden="true">→</span>
          </button>
        </article>
      </section>

      <section className="stats-grid" aria-label="Study statistics">
        <StatCard
          label="Study time"
          value={formatHours(snapshot.loggedStudyMinutes)}
          detail={`${snapshot.studyPercent}% of ${course.targetHours}h target`}
          tone="orange"
        />
        <StatCard
          label="Current streak"
          value={`${snapshot.currentStreak} ${snapshot.currentStreak === 1 ? "day" : "days"}`}
          detail={`Longest: ${snapshot.longestStreak} days`}
          tone="teal"
        />
        <StatCard
          label="Daily target"
          value={`${progress.dailyTargetMinutes} min`}
          detail="Six focused days per week"
          tone="blue"
        />
      </section>

      <section className="personal-note card" aria-label="A note for Nency">
        <span className="personal-note__mark" aria-hidden="true">
          N
        </span>
        <div>
          <p className="eyebrow">Für Nency</p>
          <h2>Du schaffst das, Chakudiiii.</h2>
          <p>
            Your German does not have to be perfect to be meaningful. Every word
            you learn is proof that you showed up for yourself today.
          </p>
        </div>
        <button
          className={`personal-note__heart ${heartBurstId ? "is-celebrating" : ""}`}
          type="button"
          aria-label="Send Nency a shower of hearts"
          onClick={() => setHeartBurstId((value) => value + 1)}
        >
          <span aria-hidden="true">♥</span>
        </button>
      </section>

      {heartBurstId > 0 && (
        <div
          className="heart-burst"
          key={heartBurstId}
          aria-hidden="true"
          data-testid="heart-burst"
        >
          {HEART_PARTICLES.map((particle, index) => (
            <span
              className="heart-burst__particle"
              key={index}
              style={
                {
                  "--heart-left": `${particle.left}%`,
                  "--heart-top": `${particle.top}%`,
                  "--heart-size": `${particle.size}px`,
                  "--heart-delay": `${particle.delay}ms`,
                  "--heart-drift": `${particle.drift}px`,
                  "--heart-rotation": `${particle.rotation}deg`,
                } as React.CSSProperties
              }
            >
              ♥
            </span>
          ))}
        </div>
      )}

      <section className="dashboard-lower">
        <article className="card today-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Today’s suggested tasks</p>
              <h2>Build momentum</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("today")}>
              Open full plan
            </button>
          </div>
          {todayTasks.length ? (
            <div className="suggested-list">
              {todayTasks.map((task, index) => (
                <div className="suggested-task" key={task.id}>
                  <span className="suggested-task__number">{index + 1}</span>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{snapshot.currentModule.title}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Today’s list is clear.</strong>
                <p>Choose the next module when you are ready.</p>
              </div>
            </div>
          )}
        </article>

        <article className="card milestone-card">
          <p className="eyebrow">Next revision gate</p>
          <div className="milestone-icon" aria-hidden="true">
            ◆
          </div>
          <h2>
            {nextMilestone.id === "T12"
              ? "Final A2 readiness"
              : nextMilestone.id === "T8"
                ? "Gate 2 · Month 2"
                : "Gate 1 · Month 1"}
          </h2>
          <p>{nextMilestone.title}</p>
          <MiniProgress
            value={getModuleProgress(nextMilestone, progress).percent}
            label={`${nextMilestone.estimatedHours} planned hours`}
          />
        </article>
      </section>

      <section className="card weekly-chart">
        <div className="card-heading">
          <div>
            <p className="eyebrow">The 12-week journey</p>
            <h2>Module completion</h2>
          </div>
          <span className="chart-legend">
            <i /> Completed work
          </span>
        </div>
        <div className="bar-chart" role="img" aria-label="Module completion chart">
          {course.modules.slice(1).map((module) => {
            const value = getModuleProgress(module, progress).percent;
            return (
              <div className="bar-chart__item" key={module.id}>
                <div className="bar-chart__track">
                  <span style={{ height: `${Math.max(5, value)}%` }} />
                </div>
                <strong>{value}%</strong>
                <span>W{module.week}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TaskRow({
  task,
  taskProgress,
  locked,
  highlighted,
  onToggle,
  onEdit,
}: {
  task: CourseTask;
  taskProgress: TaskProgress;
  locked: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`task-row ${taskProgress.completed ? "is-complete" : ""} ${
        highlighted ? "just-completed" : ""
      }`}
      data-task-id={task.id}
    >
      <button
        className="task-check"
        type="button"
        aria-label={`${taskProgress.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
        aria-pressed={taskProgress.completed}
        disabled={locked}
        onClick={onToggle}
      >
        <span aria-hidden="true">{taskProgress.completed ? "✓" : ""}</span>
      </button>
      <button className="task-copy" type="button" onClick={onEdit}>
        <strong>{task.title}</strong>
        <span>
          {taskProgress.minutesSpent ? `${taskProgress.minutesSpent} min` : "Add details"}
          {typeof taskProgress.score === "number" ? ` · ${taskProgress.score}%` : ""}
          {taskProgress.note ? " · Note added" : ""}
        </span>
      </button>
      <button
        className="icon-button"
        type="button"
        aria-label={`Edit details for ${task.title}`}
        onClick={onEdit}
      >
        ⋯
      </button>
    </div>
  );
}

function Roadmap({
  progress,
  commit,
  onToggleTask,
  onEditTask,
  lastCompletedId,
}: {
  progress: CourseProgress;
  commit: (updater: (previous: CourseProgress) => CourseProgress) => void;
  onToggleTask: (task: CourseTask) => void;
  onEditTask: (task: CourseTask) => void;
  lastCompletedId?: string;
}) {
  const snapshot = getProgressSnapshot(progress);
  const [filter, setFilter] = useState<"all" | "current" | "incomplete" | "completed">("all");
  const [search, setSearch] = useState("");

  const modules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return course.modules.filter((module) => {
      const moduleProgress = getModuleProgress(module, progress);
      const filterMatch =
        filter === "all" ||
        (filter === "current" && module.id === snapshot.currentModule.id) ||
        (filter === "incomplete" && moduleProgress.percent < 100) ||
        (filter === "completed" && moduleProgress.percent === 100);
      const haystack = [
        module.id,
        module.title,
        ...module.topics,
        ...module.grammar,
        ...module.tasks.map((task) => task.title),
      ]
        .join(" ")
        .toLowerCase();
      return filterMatch && (!query || haystack.includes(query));
    });
  }, [filter, progress, search, snapshot.currentModule.id]);

  function toggleExpanded(id: string) {
    commit((previous) => ({
      ...previous,
      expandedModuleIds: previous.expandedModuleIds.includes(id)
        ? previous.expandedModuleIds.filter((moduleId) => moduleId !== id)
        : [...previous.expandedModuleIds, id],
    }));
  }

  return (
    <div className="view">
      <PageHeader
        eyebrow="Course roadmap"
        title="Your 12-week learning journey"
        description="Open any phase, check off work with one tap, and keep every lesson connected to the bigger plan."
      />

      <section className="roadmap-tools card">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Search course</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics, grammar or tasks"
          />
        </label>
        <div className="filter-tabs" role="group" aria-label="Filter modules">
          {(["all", "current", "incomplete", "completed"] as const).map((value) => (
            <button
              key={value}
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {progress.lockMode && (
        <div className="notice" role="status">
          <span aria-hidden="true">⌑</span>
          Lock mode is on. You can explore the course, but editing is paused.
        </div>
      )}

      <div className="module-list">
        {modules.map((module) => {
          const moduleProgress = getModuleProgress(module, progress);
          const expanded = progress.expandedModuleIds.includes(module.id);
          const current = module.id === snapshot.currentModule.id;
          return (
            <article
              className={`module-card card ${current ? "is-current" : ""} ${
                moduleProgress.percent === 100 ? "is-complete" : ""
              }`}
              key={module.id}
            >
              <button
                className="module-summary"
                type="button"
                aria-expanded={expanded}
                aria-controls={`module-${module.id}`}
                onClick={() => toggleExpanded(module.id)}
              >
                <div className="module-marker">
                  <span>{moduleProgress.percent === 100 ? "✓" : module.id}</span>
                  <i aria-hidden="true" />
                </div>
                <div className="module-title">
                  <span>
                    {module.week === 0 ? "Preparation" : `Week ${module.week}`}
                    {current && <em>Current</em>}
                  </span>
                  <h2>{module.title}</h2>
                  <p>
                    {module.estimatedHours}h · {moduleProgress.completed}/
                    {moduleProgress.total} tasks
                  </p>
                </div>
                <div className="module-progress-summary">
                  <strong>{moduleProgress.percent}%</strong>
                  <div className="progress-track" aria-hidden="true">
                    <span style={{ width: `${moduleProgress.percent}%` }} />
                  </div>
                </div>
                <span className="chevron" aria-hidden="true">
                  {expanded ? "⌃" : "⌄"}
                </span>
              </button>

              {expanded && (
                <div className="module-content" id={`module-${module.id}`}>
                  <div className="module-info-grid">
                    <div>
                      <h3>Topics</h3>
                      <div className="tag-list">
                        {module.topics.map((topic) => (
                          <span key={topic}>{topic}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>Grammar focus</h3>
                      {module.grammar.length ? (
                        <ul className="clean-list">
                          {module.grammar.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">No grammar items in setup.</p>
                      )}
                    </div>
                    <div>
                      <h3>Materials</h3>
                      <div className="module-materials">
                        {module.materials.map((id) => {
                          const material = course.materials.find((item) => item.id === id);
                          return material ? (
                            <a
                              key={id}
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {material.name} <span aria-hidden="true">↗</span>
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="task-list">
                    <div className="section-label">
                      <h3>Tasks</h3>
                      <span>{moduleProgress.percent}% complete</span>
                    </div>
                    {module.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        taskProgress={progress.tasks[task.id] ?? { completed: false }}
                        locked={progress.lockMode}
                        highlighted={lastCompletedId === task.id}
                        onToggle={() => onToggleTask(task)}
                        onEdit={() => onEditTask(task)}
                      />
                    ))}
                  </div>
                  <label className="module-note">
                    <span>Personal module note</span>
                    <textarea
                      rows={2}
                      value={progress.moduleNotes[module.id] ?? ""}
                      disabled={progress.lockMode}
                      onChange={(event) =>
                        commit((previous) => ({
                          ...previous,
                          moduleNotes: {
                            ...previous.moduleNotes,
                            [module.id]: event.target.value,
                          },
                        }))
                      }
                      placeholder="Add a reminder, reflection or question…"
                    />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!modules.length && (
        <div className="card empty-panel">
          <span aria-hidden="true">⌕</span>
          <h2>No modules match</h2>
          <p>Try a different search or return to the All filter.</p>
          <button
            className="button button--secondary"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function TodayView({
  progress,
  commit,
  onContinue,
  onLogTime,
}: {
  progress: CourseProgress;
  commit: (updater: (previous: CourseProgress) => CourseProgress) => void;
  onContinue: () => void;
  onLogTime: () => void;
}) {
  const snapshot = getProgressSnapshot(progress);
  const today = todayKey();
  const activityIds = progress.todayActivities[today] ?? [];
  const plan = course.dailyPlans[progress.dailyTargetMinutes];
  const done = plan.filter((_, index) =>
    activityIds.includes(`${progress.dailyTargetMinutes}-${index}`),
  ).length;
  const routine = course.weeklyRoutine[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const isRestDay = new Date().getDay() === 0;

  function setTarget(target: DailyTargetMinutes) {
    commit((previous) => ({ ...previous, dailyTargetMinutes: target }));
  }

  function toggleActivity(index: number) {
    if (progress.lockMode) return;
    const id = `${progress.dailyTargetMinutes}-${index}`;
    commit((previous) => {
      const current = previous.todayActivities[today] ?? [];
      return {
        ...previous,
        todayActivities: {
          ...previous.todayActivities,
          [today]: current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id],
        },
      };
    });
  }

  return (
    <div className="view">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
        title={isRestDay ? "A well-earned rest day" : "Your study plan for today"}
        description={
          isRestDay
            ? "Rest is part of the plan. Review lightly only if it feels energising."
            : `${routine?.focus ?? "Focused A2 practice"} · ${snapshot.currentModule.title}`
        }
        action={
          <button className="button button--secondary" onClick={onLogTime}>
            ＋ Log time
          </button>
        }
      />

      <section className="today-layout">
        <article className="card plan-card">
          <div className="duration-picker">
            <div>
              <p className="eyebrow">Available time</p>
              <h2>Choose your pace</h2>
            </div>
            <div className="segmented-control" role="group" aria-label="Study duration">
              {([60, 90, 120] as const).map((target) => (
                <button
                  key={target}
                  className={progress.dailyTargetMinutes === target ? "is-active" : ""}
                  onClick={() => setTarget(target)}
                  type="button"
                >
                  {target} min
                </button>
              ))}
            </div>
          </div>
          <MiniProgress
            value={Math.round((done / plan.length) * 100)}
            label={`${done} of ${plan.length} activities`}
          />
          <div className="activity-list">
            {plan.map((activity, index) => {
              const match = activity.match(/^(\d+)\s+min\s+(.+)$/i);
              const id = `${progress.dailyTargetMinutes}-${index}`;
              const completed = activityIds.includes(id);
              return (
                <button
                  className={`activity-row ${completed ? "is-complete" : ""}`}
                  key={id}
                  type="button"
                  aria-pressed={completed}
                  disabled={progress.lockMode}
                  onClick={() => toggleActivity(index)}
                >
                  <span className="activity-time">{match?.[1] ?? "•"} min</span>
                  <span className="activity-title">
                    <strong>{match?.[2] ?? activity}</strong>
                    <small>
                      {index === plan.length - 1 ? "Finish with a short reflection" : "Focused block"}
                    </small>
                  </span>
                  <span className="activity-check" aria-hidden="true">
                    {completed ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </article>

        <aside className="today-sidebar">
          <article className="card next-task-card">
            <p className="eyebrow">Next course task</p>
            <span className="next-task-number">{snapshot.currentModule.id}</span>
            <h2>
              {firstIncompleteTask(snapshot.currentModule, progress)?.title ??
                "Module complete"}
            </h2>
            <p>{snapshot.currentModule.title}</p>
            <button className="button button--primary button--full" onClick={onContinue}>
              Continue in roadmap →
            </button>
          </article>
          <article className="card routine-card">
            <p className="eyebrow">Weekly rhythm</p>
            <div className="routine-list">
              {course.weeklyRoutine.map((item) => {
                const active = item.day === new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date());
                return (
                  <div className={active ? "is-active" : ""} key={item.day}>
                    <span>{item.day.slice(0, 3)}</span>
                    <p>{item.focus}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function MaterialsView({ progress }: { progress: CourseProgress }) {
  const snapshot = getProgressSnapshot(progress);
  const resources = focusResources[snapshot.currentModule.id] ?? [];

  return (
    <div className="view">
      <PageHeader
        eyebrow="Materials library"
        title="The right link for what you’re learning now"
        description="Chakudiiii’s library combines topic-specific help with the four core course resources."
      />
      <section className="focus-resources card">
        <div className="focus-resources__intro">
          <span className="focus-module">{snapshot.currentModule.id}</span>
          <p className="eyebrow">For Chakudiiii right now</p>
          <h2>{snapshot.currentModule.title}</h2>
          <p>
            These links open the exact grammar, vocabulary or practice area that
            supports the current module.
          </p>
          <div className="topic-row">
            {snapshot.currentModule.topics.slice(0, 4).map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        </div>
        <div className="focus-link-grid">
          {resources.map((resource) => (
            <a
              className="focus-link-card"
              href={resource.url}
              key={resource.title}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className={`resource-kind resource-kind--${resource.kind.toLowerCase()}`}
              >
                {resource.kind}
              </span>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <strong>
                Open this topic <span aria-hidden="true">↗</span>
              </strong>
            </a>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Core learning platforms</p>
          <h2>Your full-course toolkit</h2>
        </div>
      </div>
      <section className="materials-grid">
        {course.materials.map((material, index) => (
          <article className="card material-card" key={material.id}>
            <div className={`material-mark material-mark--${index + 1}`}>
              {["V", "N", "G", "S"][index]}
            </div>
            <div className="material-meta">
              <span>{material.id}</span>
              <span>{material.type}</span>
            </div>
            <h2>{material.name}</h2>
            <p>{material.usage}</p>
            <a
              className="button button--secondary button--full"
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open resource <span aria-hidden="true">↗</span>
            </a>
          </article>
        ))}
      </section>
      <section className="card resource-guide">
        <div>
          <p className="eyebrow">Simple study system</p>
          <h2>How the resources fit together</h2>
        </div>
        <div className="resource-steps">
          <div>
            <span>1</span>
            <strong>Learn</strong>
            <p>Use VHS-Lernportal as your structured core.</p>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>2</span>
            <strong>Listen</strong>
            <p>Build natural comprehension with Nicos Weg.</p>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>3</span>
            <strong>Prepare</strong>
            <p>Check readiness with Goethe practice materials.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressView({ progress }: { progress: CourseProgress }) {
  const snapshot = getProgressSnapshot(progress);
  const categories = ["Vocabulary", "Writing", "Speaking", "Tests"] as const;
  const categoryStats = categories.map((category) => {
    const tasks = allTasks.filter((task) => taskCategory(task.title) === category);
    const completed = tasks.filter((task) => progress.tasks[task.id]?.completed).length;
    return {
      category,
      completed,
      total: tasks.length,
      percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  });
  const scores = allTasks
    .filter((task) => isTestTask(task.title))
    .map((task) => ({ task, score: progress.tasks[task.id]?.score }))
    .filter((item): item is { task: CourseTask; score: number } => typeof item.score === "number");

  return (
    <div className="view">
      <PageHeader
        eyebrow="Progress & statistics"
        title="A clear view of your momentum"
        description="Progress is measured across completed tasks, focused hours and the four skills that make A2 useful."
      />
      <section className="progress-hero">
        <article className="card progress-overview">
          <ProgressRing value={snapshot.coursePercent} size="small" />
          <div>
            <p className="eyebrow">Task completion</p>
            <h2>
              {snapshot.completedTasks} of {snapshot.totalTasks} tasks
            </h2>
            <p>{snapshot.status}. Keep the next session manageable and specific.</p>
          </div>
        </article>
        <StatCard
          label="Logged study"
          value={formatHours(snapshot.loggedStudyMinutes)}
          detail={`${course.targetHours}h course goal`}
          tone="orange"
        />
        <StatCard
          label="Best streak"
          value={`${snapshot.longestStreak} days`}
          detail={`Current: ${snapshot.currentStreak} days`}
          tone="teal"
        />
      </section>

      <section className="progress-layout">
        <article className="card module-chart-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Module by module</p>
              <h2>Completion progress</h2>
            </div>
          </div>
          <div className="horizontal-chart">
            {course.modules.map((module) => {
              const value = getModuleProgress(module, progress).percent;
              return (
                <div className="horizontal-chart__row" key={module.id}>
                  <strong>{module.id}</strong>
                  <div className="progress-track">
                    <span style={{ width: `${value}%` }} />
                  </div>
                  <span>{value}%</span>
                </div>
              );
            })}
          </div>
        </article>

        <aside className="progress-side">
          <article className="card skills-card">
            <p className="eyebrow">Skill mix</p>
            <h2>Focused task completion</h2>
            <div className="skills-list">
              {categoryStats.map((item) => (
                <MiniProgress
                  key={item.category}
                  value={item.percent}
                  label={`${item.category} · ${item.completed}/${item.total}`}
                />
              ))}
            </div>
          </article>
          <article className="card test-card">
            <p className="eyebrow">Practice-test scores</p>
            <h2>{scores.length ? "Recorded scores" : "No scores yet"}</h2>
            {scores.length ? (
              <div className="score-list">
                {scores.slice(-4).map(({ task, score }) => (
                  <div key={task.id}>
                    <span>{task.title}</span>
                    <strong>{score}%</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Add a score from any test task in the roadmap. Your results will appear here.</p>
            )}
          </article>
        </aside>
      </section>

      <section className="card hours-comparison">
        <div>
          <p className="eyebrow">Planned versus completed</p>
          <h2>Study-hour target</h2>
        </div>
        <div className="hours-comparison__visual">
          <div>
            <span>Logged</span>
            <strong>{formatHours(snapshot.loggedStudyMinutes)}</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${snapshot.studyPercent}%` }} />
          </div>
          <div>
            <span>Planned</span>
            <strong>{course.targetHours}h</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      className={`toggle ${checked ? "is-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

type CloudStatus = "not-configured" | "signed-out" | "syncing" | "synced" | "error";

function CloudSyncSettings({
  status,
  session,
  error,
  onConnect,
  onDisconnect,
  onSyncNow,
}: {
  status: CloudStatus;
  session?: CloudSession;
  error?: string;
  onConnect: (email: string, password: string, mode: "sign-in" | "sign-up") => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const connected = Boolean(session);
  const configured = status !== "not-configured";

  function submit(event: FormEvent<HTMLFormElement>, mode: "sign-in" | "sign-up") {
    event.preventDefault();
    onConnect(email, password, mode);
  }

  return (
    <article className="card settings-section cloud-sync-card">
      <div className="settings-section__heading">
        <span aria-hidden="true">☁</span>
        <div>
          <h2>Cloud sync</h2>
          <p>Keep Chakudiiii’s progress private and available on every device.</p>
        </div>
      </div>
      {!configured ? (
        <p className="cloud-sync-card__hint">
          Cloud sync is ready in the code. Add the two Supabase values in Vercel to
          activate it.
        </p>
      ) : connected ? (
        <div className="cloud-sync-card__connected">
          <div>
            <strong>Connected as {session?.user.email ?? "your learner account"}</strong>
            <p>{status === "syncing" ? "Saving securely…" : "Progress is saved privately to the cloud."}</p>
          </div>
          <div className="cloud-sync-card__actions">
            <button className="button button--secondary" type="button" onClick={onSyncNow}>
              Sync now
            </button>
            <button className="text-button" type="button" onClick={onDisconnect}>
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form className="cloud-sync-card__form" onSubmit={(event) => submit(event, "sign-in")}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nency@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <div className="cloud-sync-card__actions">
            <button className="button button--primary" type="submit" disabled={status === "syncing"}>
              {status === "syncing" ? "Connecting…" : "Sign in to sync"}
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={status === "syncing"}
              onClick={() => onConnect(email, password, "sign-up")}
            >
              Create account
            </button>
          </div>
        </form>
      )}
      {error && <p className="cloud-sync-card__error" role="alert">{error}</p>}
    </article>
  );
}

function SettingsView({
  progress,
  commit,
  onSave,
  onExport,
  onImport,
  onReset,
  cloudStatus,
  cloudSession,
  cloudError,
  onCloudConnect,
  onCloudDisconnect,
  onCloudSyncNow,
}: {
  progress: CourseProgress;
  commit: (
    updater: (previous: CourseProgress) => CourseProgress,
    forceSave?: boolean,
  ) => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  cloudStatus: CloudStatus;
  cloudSession?: CloudSession;
  cloudError?: string;
  onCloudConnect: (email: string, password: string, mode: "sign-in" | "sign-up") => void;
  onCloudDisconnect: () => void;
  onCloudSyncNow: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="view">
      <PageHeader
        eyebrow="Settings & data"
        title="Make the tracker yours"
        description="Adjust your study rhythm, protect your progress and move your data safely between devices."
      />
      <section className="settings-layout">
        <div className="settings-main">
          <article className="card settings-section">
            <div className="settings-section__heading">
              <span aria-hidden="true">◐</span>
              <div>
                <h2>Appearance</h2>
                <p>Choose the theme that feels most comfortable.</p>
              </div>
            </div>
            <div className="theme-options">
              {(["light", "dark"] as const).map((theme) => (
                <button
                  key={theme}
                  className={progress.theme === theme ? "is-active" : ""}
                  type="button"
                  onClick={() => commit((previous) => ({ ...previous, theme }))}
                >
                  <span className={`theme-preview theme-preview--${theme}`}>
                    <i />
                    <b />
                  </span>
                  <strong>{theme === "light" ? "Light mode" : "Dark mode"}</strong>
                  <small>{theme === "light" ? "Bright and calm" : "Low-light focus"}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="card settings-section">
            <div className="settings-section__heading">
              <span aria-hidden="true">◷</span>
              <div>
                <h2>Study plan</h2>
                <p>Set your default daily pace and course start date.</p>
              </div>
            </div>
            <div className="setting-field">
              <label htmlFor="daily-target">Daily target</label>
              <select
                id="daily-target"
                value={progress.dailyTargetMinutes}
                onChange={(event) =>
                  commit((previous) => ({
                    ...previous,
                    dailyTargetMinutes: Number(event.target.value) as DailyTargetMinutes,
                  }))
                }
              >
                <option value={60}>60 minutes · Steady</option>
                <option value={90}>90 minutes · Recommended</option>
                <option value={120}>120 minutes · Intensive</option>
              </select>
            </div>
            <div className="setting-field">
              <label htmlFor="start-date">Course start date</label>
              <input
                id="start-date"
                type="date"
                value={progress.startDate}
                onChange={(event) =>
                  commit((previous) => ({ ...previous, startDate: event.target.value }))
                }
              />
            </div>
          </article>

          <article className="card settings-section">
            <div className="settings-section__heading">
              <span aria-hidden="true">⌁</span>
              <div>
                <h2>Saving & protection</h2>
                <p>Control how changes are stored on this device.</p>
              </div>
            </div>
            <div className="toggle-row">
              <div>
                <strong>Auto-save progress</strong>
                <p>Save every task, note and setting immediately. On by default.</p>
              </div>
              <Toggle
                checked={progress.autoSave}
                label="Auto-save progress"
                onChange={(autoSave) =>
                  commit((previous) => ({ ...previous, autoSave }), true)
                }
              />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Lock editing</strong>
                <p>Prevent accidental task and plan changes.</p>
              </div>
              <Toggle
                checked={progress.lockMode}
                label="Lock editing"
                onChange={(lockMode) =>
                  commit((previous) => ({ ...previous, lockMode }))
                }
              />
            </div>
            {!progress.autoSave && (
              <button className="button button--primary" onClick={onSave}>
                Save changes now
              </button>
            )}
          </article>
          <CloudSyncSettings
            status={cloudStatus}
            session={cloudSession}
            error={cloudError}
            onConnect={onCloudConnect}
            onDisconnect={onCloudDisconnect}
            onSyncNow={onCloudSyncNow}
          />
        </div>

        <aside className="settings-side">
          <article className="card data-card">
            <p className="eyebrow">Backup & transfer</p>
            <h2>Your progress belongs to you</h2>
            <p>
              Export a portable JSON backup, then import it on another device or
              after a reset.
            </p>
            <button className="button button--secondary button--full" onClick={onExport}>
              ↓ Export progress
            </button>
            <button
              className="button button--secondary button--full"
              onClick={() => fileInput.current?.click()}
            >
              ↑ Import backup
            </button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={onImport}
            />
          </article>
          <article className="card install-card">
            <p className="eyebrow">iPad app mode</p>
            <h2>Add to Home Screen</h2>
            <p>
              In Safari, tap Share and choose “Add to Home Screen” for a focused,
              app-like experience.
            </p>
            <span>Works offline after the first visit</span>
          </article>
          <article className="card danger-card">
            <h2>Reset progress</h2>
            <p>Start again while keeping the original course content intact.</p>
            <button className="danger-button" onClick={onReset}>
              Reset all progress
            </button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog__header">
          <div>
            <p className="eyebrow">German A2 tracker</p>
            <h2 id="dialog-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TaskDetailsDialog({
  task,
  taskProgress,
  locked,
  onClose,
  onSave,
}: {
  task: CourseTask;
  taskProgress: TaskProgress;
  locked: boolean;
  onClose: () => void;
  onSave: (details: TaskProgress) => void;
}) {
  const [note, setNote] = useState(taskProgress.note ?? "");
  const [minutes, setMinutes] = useState(taskProgress.minutesSpent?.toString() ?? "");
  const [score, setScore] = useState(taskProgress.score?.toString() ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...taskProgress,
      note: note.trim() || undefined,
      minutesSpent: minutes ? Math.max(0, Number(minutes)) : undefined,
      score: score ? Math.min(100, Math.max(0, Number(score))) : undefined,
    });
  }

  return (
    <DialogShell title={task.title} description="Add optional details to this task." onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label>
          Personal note
          <textarea
            rows={4}
            value={note}
            disabled={locked}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What did you learn? What needs another look?"
          />
        </label>
        <div className="form-grid">
          <label>
            Time spent (minutes)
            <input
              type="number"
              min={0}
              max={480}
              value={minutes}
              disabled={locked}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          {isTestTask(task.title) && (
            <label>
              Score (%)
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                disabled={locked}
                onChange={(event) => setScore(event.target.value)}
              />
            </label>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={locked}>
            Save details
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function StudyLogDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (log: StudyLog) => void;
}) {
  const [date, setDate] = useState(todayKey());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(minutes);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onSave({
      id: `study-${Date.now()}`,
      date,
      minutes: Math.min(720, amount),
      note: note.trim() || undefined,
    });
  }

  return (
    <DialogShell
      title="Log study time"
      description="Record a focused session. It counts toward the 108-hour target."
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Minutes
            <input
              type="number"
              min={1}
              max={720}
              required
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
        </div>
        <label>
          Session note (optional)
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Listening, grammar, speaking practice…"
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary">
            Add study time
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

export function GermanTrackerApp() {
  const [progress, setProgress] = useState<CourseProgress>(createDefaultProgress);
  const [view, setView] = useState<ViewId>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [editingTask, setEditingTask] = useState<CourseTask>();
  const [showStudyLog, setShowStudyLog] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [toast, setToast] = useState<string>();
  const [lastCompletedId, setLastCompletedId] = useState<string>();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cloudSession, setCloudSession] = useState<CloudSession>();
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() =>
    isCloudSyncConfigured() ? "signed-out" : "not-configured",
  );
  const [cloudError, setCloudError] = useState<string>();

  const syncCloud = useCallback(
    async (value: CourseProgress, session = cloudSession) => {
      if (!session || !isCloudSyncConfigured()) return;
      setCloudStatus("syncing");
      setCloudError(undefined);
      try {
        await saveCloudProgress(session, value);
        setCloudStatus("synced");
      } catch (error) {
        setCloudStatus("error");
        setCloudError(error instanceof Error ? error.message : "Cloud sync could not save right now.");
      }
    },
    [cloudSession],
  );

  const persist = useCallback((value: CourseProgress, forceCloudSave = false) => {
    const saved = { ...value, lastSavedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    if (cloudSession && (saved.autoSave || forceCloudSave)) {
      void syncCloud(saved);
    }
    return saved;
  }, [cloudSession, syncCloud]);

  const commit = useCallback(
    (
      updater: (previous: CourseProgress) => CourseProgress,
      forceSave = false,
    ) => {
      setProgress((previous) => {
        const next = updater(previous);
        return forceSave || previous.autoSave || next.autoSave ? persist(next, forceSave) : next;
      });
    },
    [persist],
  );

  useEffect(() => {
    let initialProgress = createDefaultProgress();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      initialProgress = stored
        ? mergeProgress(JSON.parse(stored))
        : createDefaultProgress();
    } catch {}
    queueMicrotask(() => {
      setProgress(initialProgress);
      setView(viewFromHash());
      setHydrated(true);
    });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!isCloudSyncConfigured()) return;
    const session = readCloudSession();
    if (!session) return;
    let cancelled = false;
    setCloudStatus("syncing");
    void refreshCloudSession(session)
      .then((refreshedSession) => {
        if (cancelled) return null;
        setCloudSession(refreshedSession);
        return loadCloudProgress(refreshedSession);
      })
      .then((cloudProgress) => {
        if (cancelled) return;
        if (cloudProgress) {
          const incoming = mergeProgress(cloudProgress.data);
          setProgress(incoming);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
        }
        setCloudStatus("synced");
      })
      .catch((error) => {
        if (cancelled) return;
        setCloudStatus("error");
        setCloudError(error instanceof Error ? error.message : "Cloud sync could not connect.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
    document.documentElement.style.colorScheme = progress.theme;
  }, [progress.theme]);

  useEffect(() => {
    const handleHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(nextView: ViewId) {
    setNotificationsOpen(false);
    setView(nextView);
    window.history.pushState(null, "", `#/${nextView}`);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function continueLearning() {
    const snapshot = getProgressSnapshot(progress);
    const task = firstIncompleteTask(snapshot.currentModule, progress);
    commit((previous) => ({
      ...previous,
      expandedModuleIds: previous.expandedModuleIds.includes(snapshot.currentModule.id)
        ? previous.expandedModuleIds
        : [...previous.expandedModuleIds, snapshot.currentModule.id],
    }));
    navigate("roadmap");
    if (task) {
      window.setTimeout(() => {
        document
          .querySelector(`[data-task-id="${task.id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 180);
    }
  }

  function saveTaskDetails(details: TaskProgress) {
    if (!editingTask) return;
    commit((previous) => ({
      ...previous,
      tasks: { ...previous.tasks, [editingTask.id]: details },
    }));
    setEditingTask(undefined);
    setToast("Task details saved");
  }

  function addStudyLog(log: StudyLog) {
    commit((previous) => ({ ...previous, studyLogs: [...previous.studyLogs, log] }));
    setShowStudyLog(false);
    setToast(`${log.minutes} study minutes added — stark, Nency!`);
  }

  function toggleNotifications() {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (!willOpen) return;

    const ids = buildLearningNotifications(progress).map(
      (notification) => notification.id,
    );
    commit((previous) => ({
      ...previous,
      readNotificationIds: [...new Set([...previous.readNotificationIds, ...ids])],
    }));
  }

  function saveNow() {
    setProgress((previous) => persist(previous, true));
    setToast(cloudSession ? "Progress saved on this device and in the cloud" : "Progress saved on this device");
  }

  async function connectCloud(email: string, password: string, mode: "sign-in" | "sign-up") {
    setCloudStatus("syncing");
    setCloudError(undefined);
    try {
      const session =
        mode === "sign-in"
          ? await signInToCloud(email, password)
          : await signUpForCloud(email, password);
      setCloudSession(session);
      const cloudProgress = await loadCloudProgress(session);
      if (cloudProgress) {
        const incoming = mergeProgress(cloudProgress.data);
        setProgress(persist(incoming));
      } else {
        await syncCloud(progress, session);
      }
      setCloudStatus("synced");
      setToast("Cloud sync is on — your progress can follow you everywhere.");
    } catch (error) {
      setCloudStatus("error");
      setCloudError(error instanceof Error ? error.message : "Cloud sync could not connect.");
    }
  }

  async function disconnectCloud() {
    const session = cloudSession;
    clearCloudSession();
    setCloudSession(undefined);
    setCloudStatus(isCloudSyncConfigured() ? "signed-out" : "not-configured");
    if (session) await signOutOfCloud(session).catch(() => undefined);
    setToast("Cloud sync disconnected. Your device copy is still safe.");
  }

  function exportProgress() {
    const backup = {
      app: "German A2 in 12 Weeks",
      exportedAt: new Date().toISOString(),
      progress,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `german-a2-progress-${todayKey()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setToast("Progress backup exported");
  }

  async function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = mergeProgress(parsed.progress ?? parsed);
      setProgress(persist(imported));
      setToast("Progress imported successfully");
    } catch {
      setToast("That file is not a valid progress backup");
    }
  }

  function resetProgress() {
    const next = persist(createDefaultProgress());
    setProgress(next);
    setShowReset(false);
    setLastCompletedId(undefined);
    setToast("Progress reset. Your course content is unchanged.");
  }

  function toggleTask(task: CourseTask) {
    if (progress.lockMode) return;
    const wasComplete = progress.tasks[task.id]?.completed;
    commit((previous) => ({
      ...previous,
      tasks: {
        ...previous.tasks,
        [task.id]: {
          ...previous.tasks[task.id],
          completed: !wasComplete,
          completedAt: !wasComplete ? new Date().toISOString() : undefined,
        },
      },
    }));
    if (!wasComplete) {
      setLastCompletedId(task.id);
      const courseModule = course.modules.find((item) => item.id === task.moduleId)!;
      const willCompleteModule = courseModule.tasks.every(
        (item) => item.id === task.id || progress.tasks[item.id]?.completed,
      );
      setToast(
        willCompleteModule
          ? `${courseModule.id} complete — ausgezeichnet, Chakudiiii!`
          : "Task complete — schön gemacht, Chakudiiii!",
      );
    }
  }

  if (!hydrated) {
    return (
      <main className="app-loading" aria-live="polite">
        <div className="brand-mark">DE</div>
        <p>Preparing your course…</p>
      </main>
    );
  }

  const snapshot = getProgressSnapshot(progress);
  const notifications = buildLearningNotifications(progress);
  const unreadNotifications = notifications.filter(
    (notification) => !progress.readNotificationIds.includes(notification.id),
  ).length;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark" aria-label="Deutsch A2">
            <span>DE</span>
            <small>A2</small>
          </div>
          <div className="brand-copy">
            <strong>Deutsch A2</strong>
            <span>12-week tracker</span>
          </div>
        </div>
        <button
          className="sidebar-toggle icon-button"
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "is-active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              aria-label={sidebarCollapsed ? item.label : undefined}
              onClick={() => navigate(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
        <div className="sidebar-progress">
          <div>
            <span>Course progress</span>
            <strong>{snapshot.coursePercent}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${snapshot.coursePercent}%` }} />
          </div>
          <p>{snapshot.completedTasks} tasks completed</p>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">N</span>
          <div>
            <strong>Chakudiiii’s A2 journey</strong>
            <span>For Nency · 108 hours</span>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <div className="topbar">
          <div className="notification-wrap">
            <button
              className="notification-button"
              type="button"
              aria-label={`Learning notifications${
                unreadNotifications ? `, ${unreadNotifications} unread` : ""
              }`}
              aria-expanded={notificationsOpen}
              onClick={toggleNotifications}
            >
              <span aria-hidden="true">✦</span>
              {unreadNotifications > 0 && (
                <span className="notification-badge">{unreadNotifications}</span>
              )}
            </button>
            {notificationsOpen && (
              <section
                className="notification-panel"
                aria-label="Learning notifications"
              >
                <div className="notification-panel__header">
                  <div>
                    <p className="eyebrow">A little encouragement</p>
                    <h2>Für Chakudiiii</h2>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="notification-list">
                  {notifications.map((notification) => (
                    <article
                      className={`notification-item notification-item--${notification.tone}`}
                      key={notification.id}
                    >
                      <span aria-hidden="true" />
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
          <div>
            <span
              className={`save-dot ${
                progress.autoSave ? "save-dot--on" : "save-dot--off"
              }`}
              aria-hidden="true"
            />
            <span>
              {progress.autoSave
                ? progress.lastSavedAt
                  ? "Auto-saved"
                  : "Auto-save on"
                : "Auto-save paused"}
            </span>
          </div>
          {!progress.autoSave && (
            <button className="text-button" onClick={saveNow}>
              Save now
            </button>
          )}
          {progress.lockMode && <span className="lock-pill">⌑ Locked</span>}
        </div>

        <main className="main-content">
          {view === "dashboard" && (
            <Dashboard
              progress={progress}
              onNavigate={navigate}
              onContinue={continueLearning}
              onLogTime={() => setShowStudyLog(true)}
            />
          )}
          {view === "roadmap" && (
            <Roadmap
              progress={progress}
              commit={commit}
              onToggleTask={toggleTask}
              onEditTask={setEditingTask}
              lastCompletedId={lastCompletedId}
            />
          )}
          {view === "today" && (
            <TodayView
              progress={progress}
              commit={commit}
              onContinue={continueLearning}
              onLogTime={() => setShowStudyLog(true)}
            />
          )}
          {view === "materials" && <MaterialsView progress={progress} />}
          {view === "progress" && <ProgressView progress={progress} />}
          {view === "settings" && (
            <SettingsView
              progress={progress}
              commit={commit}
              onSave={saveNow}
              onExport={exportProgress}
              onImport={importProgress}
              onReset={() => setShowReset(true)}
              cloudStatus={cloudStatus}
              cloudSession={cloudSession}
              cloudError={cloudError}
              onCloudConnect={connectCloud}
              onCloudDisconnect={disconnectCloud}
              onCloudSyncNow={() => void syncCloud(progress)}
            />
          )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "is-active" : ""}
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => navigate(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
        <button
          className={view === "settings" ? "is-active" : ""}
          aria-current={view === "settings" ? "page" : undefined}
          onClick={() => navigate("settings")}
        >
          <span aria-hidden="true">⚙</span>
          <strong>More</strong>
        </button>
      </nav>

      {editingTask && (
        <TaskDetailsDialog
          task={editingTask}
          taskProgress={progress.tasks[editingTask.id] ?? { completed: false }}
          locked={progress.lockMode}
          onClose={() => setEditingTask(undefined)}
          onSave={saveTaskDetails}
        />
      )}
      {showStudyLog && (
        <StudyLogDialog
          onClose={() => setShowStudyLog(false)}
          onSave={addStudyLog}
        />
      )}
      {showReset && (
        <DialogShell
          title="Reset all progress?"
          description="This removes completed tasks, notes, scores and study logs from this device. Export a backup first if you may need them."
          onClose={() => setShowReset(false)}
        >
          <div className="dialog-actions">
            <button
              className="button button--secondary"
              onClick={() => setShowReset(false)}
            >
              Keep my progress
            </button>
            <button className="danger-button" onClick={resetProgress}>
              Yes, reset everything
            </button>
          </div>
        </DialogShell>
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
