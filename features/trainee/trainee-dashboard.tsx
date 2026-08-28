"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Check,
  Circle,
  ClipboardCheck,
  FileText,
  ListChecks,
  Lock,
  Megaphone,
  Play,
  Trophy,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DASHBOARD_PREVIEW_COUNT, ViewMoreFooter } from "@/components/view-more-footer";
import { TraineeCourseFilters } from "@/components/trainee-course-filters";
import { ContentTypeChip, ContentTypeIcon } from "@/components/learning/content-type-chip";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { getTraineeDashboard } from "@/lib/api/trainee";
import { getTraineeLearnView } from "@/lib/api/learning";
import { getTraineeProgress } from "@/lib/api/progress";
import { ApiClientError } from "@/lib/api/client";
import { AppUsagePanel } from "@/features/app-usage/app-usage-panel";
import { traineeContinueHref, traineePathHref } from "@/lib/learning/path";
import { currentDayItems, flattenLearnPath, isDoneStatus, locationLabel, progressHeadline } from "@/lib/learning/ux";
import { traineePrimaryCtaClass } from "@/lib/ui/trainee";
import type { AuthUser } from "@/types/api";
import type { CalendarEventType } from "@/types/calendar";
import type { DashboardRange } from "@/types/trainer-dashboard";
import type {
  TraineeCurrentLearning,
  TraineeDashboard,
  TraineeDashboardAnnouncement,
  TraineePendingAssignment,
  TraineeTopStudent,
  TraineeUpcomingEvent,
} from "@/types/trainee-dashboard";
import type { LearnView } from "@/types/learning";
import type { ProgressView } from "@/types/progress";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const EVENT_STYLE: Record<CalendarEventType, { wrap: string; icon: typeof CalendarDays }> = {
  SESSION: { wrap: "bg-emerald-50 text-emerald-700", icon: CalendarDays },
  EXAM: { wrap: "bg-sky-50 text-sky-700", icon: ClipboardCheck },
  ASSIGNMENT: { wrap: "bg-amber-50 text-amber-700", icon: ListChecks },
  MILESTONE: { wrap: "bg-fuchsia-50 text-fuchsia-700", icon: Trophy },
  DEADLINE: { wrap: "bg-rose-50 text-rose-700", icon: FileText },
  PROGRAM: { wrap: "bg-violet-50 text-violet-700", icon: BookOpen },
};

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? name;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
}

function formatRemaining(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) {
    return `${hours}h ${rest}m left`;
  }
  if (hours > 0) {
    return `${hours}h left`;
  }
  return `${rest}m left`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDue(iso: string | null): string {
  if (!iso) {
    return "No due date";
  }
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function assignmentStatus(row: TraineePendingAssignment): { label: string; className: string } {
  if (row.isLate) {
    return { label: "Late", className: "bg-rose-50 text-rose-800" };
  }
  if (row.status === "IN_PROGRESS") {
    return { label: "Draft", className: "bg-sky-50 text-sky-800" };
  }
  if (row.status === "CHANGES_REQUESTED") {
    return { label: "Changes requested", className: "bg-amber-50 text-amber-800" };
  }
  return { label: "Pending", className: "bg-amber-50 text-amber-800" };
}

export function TraineeDashboard({ user }: { user: AuthUser }) {
  const [range, setRange] = useState<DashboardRange>("week");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState<TraineeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTraineeDashboard(range)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setDashboard(payload.dashboard);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setDashboard(null);
        setError(err instanceof ApiClientError ? err.message : "Unable to load dashboard");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  function retry() {
    setRefreshKey((value) => value + 1);
  }

  function retryPage() {
    setError(null);
    setLoading(true);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="lms-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Welcome back, {firstName(user.name)}</h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s on your plate today.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="sr-only">Dashboard date range</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as DashboardRange)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition duration-150 hover:border-slate-300 focus-visible:border-violet-400"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className={`${CARD} p-5`}>
          <p role="alert" className="text-sm text-red-700">
            Unable to load your learning progress.
          </p>
          <button type="button" className="mt-3 rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition duration-150 hover:bg-violet-700" onClick={retryPage}>
            Retry
          </button>
        </div>
      ) : null}

      {!error && (loading || !dashboard) ? <DashboardSkeleton /> : null}
      {!error && dashboard && !loading ? <DashboardBody dashboard={dashboard} onRetry={retry} /> : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${CARD} h-28 animate-pulse bg-slate-100/80`} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className={`${CARD} h-72 animate-pulse bg-slate-100/80 xl:col-span-5`} />
        <div className={`${CARD} h-72 animate-pulse bg-slate-100/80 xl:col-span-3`} />
        <div className={`${CARD} h-72 animate-pulse bg-slate-100/80 xl:col-span-4`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className={`${CARD} h-56 animate-pulse bg-slate-100/80 xl:col-span-3`} />
        <div className={`${CARD} h-56 animate-pulse bg-slate-100/80 xl:col-span-2`} />
      </div>
    </div>
  );
}

function DashboardBody({ dashboard, onRetry }: { dashboard: TraineeDashboard; onRetry: () => void }) {
  const { statistics } = dashboard;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/trainee/learn" label="Your courses" value={`${statistics.enrolledPrograms.total}`} hint={`${statistics.enrolledPrograms.active} in progress`} hintClass="text-violet-700" icon={BookOpen} iconClass="bg-violet-100 text-violet-700" />
        <StatCard href="/trainee/progress" label="Overall progress" value={`${Math.round(statistics.overallProgress.percent)}%`} hint={statistics.overallProgress.percent >= 85 ? "Almost there" : "Keep going"} hintClass="text-emerald-600" icon={ClipboardCheck} iconClass="bg-emerald-100 text-emerald-700" />
        <StatCard href="/trainee/assignments" label="Pending assignments" value={`${statistics.pendingAssignments.total}`} hint="Due soon" hintClass="text-amber-600" icon={ListChecks} iconClass="bg-amber-100 text-amber-700" />
        <StatCard href="/trainee/calendar" label="Upcoming quizzes" value={`${statistics.upcomingAssessments.total}`} hint="In this range" hintClass="text-sky-700" icon={CalendarDays} iconClass="bg-sky-100 text-sky-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <CourseCard learning={dashboard.currentLearning} error={dashboard.errors.learning} onRetry={onRetry} />
        <TopStudentCard top={dashboard.topStudent} error={dashboard.errors.topStudent} onRetry={onRetry} />
        <UpcomingCard events={dashboard.upcoming} error={dashboard.errors.upcoming} onRetry={onRetry} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <AssignmentsCard rows={dashboard.pendingAssignments} error={dashboard.errors.assignments} onRetry={onRetry} />
        <AnnouncementsCard rows={dashboard.announcements} error={dashboard.errors.announcements} onRetry={onRetry} />
      </div>

      <AppUsagePanel audience="trainee" />
    </>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
  hintClass,
  icon: Icon,
  iconClass,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  hintClass: string;
  icon: typeof BookOpen;
  iconClass: string;
}) {
  return (
    <Link href={href} className={`${CARD} flex items-start gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-violet-200`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className={`mt-1 text-xs font-medium ${hintClass}`}>{hint}</p>
      </div>
    </Link>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-5 pb-5">
      <p className="text-sm text-red-700">{message}</p>
      <button type="button" className="mt-2 text-sm font-medium text-red-950 underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function toCurrentLearning(learn: LearnView, progress: ProgressView, batchId?: string): TraineeCurrentLearning {
  const batchQuery = batchId ? `&batchId=${encodeURIComponent(batchId)}` : "";
  const completed = progress.milestones.filter((item) => item.satisfied).slice(-4);
  const upcoming = progress.milestones.find((item) => !item.satisfied) ?? null;
  return {
    program: {
      id: learn.program.id,
      title: learn.program.title,
      category: learn.program.category,
      durationWeeks: learn.program.durationWeeks,
    },
    enrollmentStatus: learn.enrollment.status,
    percent: learn.progress.percent,
    currentWeek: learn.currentWeek,
    currentDay: learn.currentDay,
    nextActivity: learn.nextActivity,
    remainingMinutes: remainingMinutesFromLearn(learn),
    continueHref: traineeContinueHref(learn.program.id, learn.nextActivity, batchId),
    materialsHref: traineePathHref(learn.program.id, null, batchId),
    quizzesHref: "/trainee/assessments",
    assignmentsHref: "/trainee/assignments",
    programHref: `/trainee/program?programId=${learn.program.id}${batchQuery}`,
    progressHref: `/trainee/progress?programId=${learn.program.id}${batchQuery}`,
    milestones: {
      completed: completed.map((item) => ({ id: item.id, title: item.title })),
      upcoming: upcoming ? { id: upcoming.id, title: upcoming.title } : null,
      current: progress.currentMilestone,
    },
  };
}

function remainingMinutesFromLearn(learn: LearnView): number | null {
  let minutes = 0;
  let hasDuration = false;
  for (const week of learn.weeks) {
    for (const day of week.days) {
      for (const item of day.items) {
        if (item.status === "COMPLETED" || item.status === "PASSED") {
          continue;
        }
        if (item.durationMin && item.durationMin > 0) {
          minutes += item.durationMin;
          hasDuration = true;
        } else if (item.durationSec && item.durationSec > 0) {
          minutes += Math.ceil(item.durationSec / 60);
          hasDuration = true;
        }
      }
    }
  }
  return hasDuration ? minutes : null;
}

function CourseCard({
  learning: initial,
  error,
  onRetry,
}: {
  learning: TraineeCurrentLearning | null;
  error: string | null;
  onRetry: () => void;
}) {
  const filters = useTraineeEnrollment({ programId: initial?.program.id });
  const [learning, setLearning] = useState<TraineeCurrentLearning | null>(initial);
  const [learnView, setLearnView] = useState<LearnView | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLearning(initial);
  }, [initial]);

  useEffect(() => {
    if (!filters.ready || !filters.programId) {
      return;
    }
    if (filters.batches.length > 0 && !filters.batchId) {
      return;
    }
    let cancelled = false;
    Promise.all([
      getTraineeLearnView(filters.programId, filters.batchId || undefined),
      getTraineeProgress(filters.programId, filters.batchId || undefined),
    ])
      .then(([learn, progress]) => {
        if (!cancelled) {
          setLearnView(learn);
          setLearning(toCurrentLearning(learn, progress, filters.batchId || undefined));
          setLocalError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLocalError(err instanceof ApiClientError ? err.message : "Unable to load your current course.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.ready, filters.programId, filters.batchId, initial]);

  const loadError = localError ?? error;
  const mission = learning?.nextActivity ?? null;
  const today = learnView ? currentDayItems(learnView, flattenLearnPath(learnView)) : [];
  const todayDone = today.filter((item) => isDoneStatus(item.status)).length;
  const headline = learning
    ? progressHeadline(learnView?.progress.completedRequired ?? 0, learnView?.progress.totalRequired ?? 0, learning.percent)
    : "Ready when you are";

  return (
    <section className={`${CARD} flex flex-col overflow-hidden xl:col-span-5`}>
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/40 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Today&apos;s Mission</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">{learning?.program.title ?? "Your course"}</h2>
          </div>
          {learning ? (
            <Link href={learning.progressHref} className="text-xs font-medium text-violet-700 hover:text-violet-800">
              Your Journey
            </Link>
          ) : null}
        </div>
        {filters.programs.length > 1 || filters.batches.length > 1 ? (
          <div className="mt-3">
            <TraineeCourseFilters
              programs={filters.programs}
              batches={filters.batches}
              programId={filters.programId}
              batchId={filters.batchId}
              onProgramChange={filters.setProgramId}
              onBatchChange={filters.setBatchId}
            />
          </div>
        ) : null}
      </div>
      {loadError ? <SectionError message="Unable to load today's mission." onRetry={onRetry} /> : null}
      {!loadError && !learning && filters.ready && filters.enrollments.length === 0 ? (
        <div className="px-5 pb-6 pt-2">
          <p className="text-sm font-medium text-slate-800">Nothing assigned yet</p>
          <p className="mt-1 text-sm text-slate-500">When you&apos;re enrolled, today&apos;s mission will show up here.</p>
        </div>
      ) : null}
      {!loadError && learning ? (
        <div className="flex flex-1 flex-col px-5 py-5">
          {mission ? (
            <div className="flex items-start gap-3">
              <ContentTypeIcon type={mission.type} />
              <div className="min-w-0 flex-1">
                <ContentTypeChip type={mission.type} />
                <p className="mt-2 font-semibold text-slate-900">{mission.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{locationLabel(mission.weekTitle, mission.dayTitle)}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-900">You&apos;re all caught up</p>
              <p className="mt-1 text-sm text-slate-500">Come back when the next step unlocks.</p>
            </div>
          )}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{headline}</span>
              {learning.remainingMinutes != null && learning.percent < 100 ? (
                <span>{formatRemaining(learning.remainingMinutes)}</span>
              ) : (
                <span>{Math.round(learning.percent)}%</span>
              )}
            </div>
            <ProgressBar value={learning.percent} tone="violet" size="md" />
          </div>
          <Link href={learning.continueHref} className={`${traineePrimaryCtaClass} mt-4`}>
            <Play className="h-4 w-4 fill-current" />
            Continue Learning
          </Link>
          {today.length > 0 ? (
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4">
              <li className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {todayDone} of {today.length} completed today
              </li>
              {today.slice(0, 4).map((item) => {
                const done = isDoneStatus(item.status);
                const locked = item.status === "LOCKED";
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={traineeContinueHref(learning.program.id, item, filters.batchId || undefined)}
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition duration-150 hover:bg-slate-50"
                    >
                      {done ? (
                        <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                      ) : locked ? (
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-violet-400" />
                      )}
                      <span className={`min-w-0 flex-1 truncate ${done ? "text-slate-500" : "text-slate-800"}`}>{item.title}</span>
                      <span className="text-[11px] text-slate-400">{done ? "Done" : locked ? "Locked" : "Up next"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <MilestoneSummary learning={learning} />
        </div>
      ) : null}
    </section>
  );
}

function MilestoneSummary({ learning }: { learning: TraineeCurrentLearning }) {
  const upcoming = learning.milestones.upcoming;
  if (!upcoming) {
    return null;
  }
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">You&apos;ll unlock next</p>
        <Link href={learning.progressHref} className="text-xs font-medium text-violet-700 hover:text-violet-800">
          Your Journey
        </Link>
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Lock className="h-3.5 w-3.5" />
        {upcoming.title}
      </p>
    </div>
  );
}

function TopStudentCard({
  top,
  error,
  onRetry,
}: {
  top: TraineeTopStudent | null;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className={`${CARD} xl:col-span-3`}>
      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Top of the class</h2>
      </div>
      {error ? <SectionError message="Unable to load leaderboard." onRetry={onRetry} /> : null}
      {!error && !top ? (
        <div className="px-5 pb-6">
          <p className="text-sm text-slate-500">Leaderboard appears once classmates are enrolled.</p>
        </div>
      ) : null}
      {!error && top ? (
        <Link href={top.href} className="block px-5 pb-5 transition duration-150 hover:bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
              {initialsFromName(top.trainee.name)}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{top.isYou ? `${top.trainee.name} (you)` : top.trainee.name}</p>
              <p className="text-xs text-emerald-700">Top performer</p>
            </div>
            <Trophy className="ml-auto h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-sm text-slate-600">{Math.round(top.progressPercent)}% overall progress</p>
          <p className="mt-1 text-sm font-medium text-slate-900">Score {top.score}</p>
        </Link>
      ) : null}
    </section>
  );
}

function UpcomingCard({
  events,
  error,
  onRetry,
}: {
  events: TraineeUpcomingEvent[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className={`${CARD} flex flex-col xl:col-span-4`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Upcoming</h2>
        <Link href="/trainee/calendar" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          View calendar
        </Link>
      </div>
      {error ? <SectionError message="Unable to load upcoming events." onRetry={onRetry} /> : null}
      {!error && events.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-500">No upcoming quizzes, exams, or deadlines in this range.</p>
      ) : null}
      {!error && events.length > 0 ? (
        <ul className="flex-1 space-y-1 px-2 pb-3">
          {events.map((event) => {
            const style = EVENT_STYLE[event.type];
            const Icon = style.icon;
            return (
              <li key={event.id}>
                <Link href={event.href} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition duration-150 hover:bg-slate-50">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.wrap}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{event.title}</span>
                    <span className="block text-xs text-slate-500">{event.program.title}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-500">{formatWhen(event.startsAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function AssignmentsCard({
  rows,
  error,
  onRetry,
}: {
  rows: TraineePendingAssignment[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className={`${CARD} overflow-hidden xl:col-span-3`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Pending assignments</h2>
        <Link href="/trainee/assignments" className="text-sm font-medium text-violet-700 hover:text-violet-800">
          View all
        </Link>
      </div>
      {error ? <SectionError message="Unable to load assignments." onRetry={onRetry} /> : null}
      {!error && rows.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-slate-500">No pending assignments. You&apos;re all caught up.</p>
      ) : null}
      {!error && rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-y border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Assignment</th>
                  <th className="px-3 py-2.5 font-medium">Course</th>
                  <th className="px-3 py-2.5 font-medium">Due date</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const status = assignmentStatus(row);
                  return (
                    <tr key={row.id} className="text-slate-700 transition duration-150 hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        <Link href={row.href} className="font-medium text-slate-900 hover:text-violet-700">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{row.programTitle}</td>
                      <td className="px-3 py-3 text-slate-500">{formatDue(row.dueDate)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((row) => {
              const status = assignmentStatus(row);
              return (
                <li key={row.id}>
                  <Link href={row.href} className="block px-5 py-3 transition duration-150 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">{row.title}</p>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.programTitle} · {formatDue(row.dueDate)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function AnnouncementsCard({
  rows,
  error,
  onRetry,
}: {
  rows: TraineeDashboardAnnouncement[];
  error: string | null;
  onRetry: () => void;
}) {
  const preview = rows.slice(0, DASHBOARD_PREVIEW_COUNT);
  return (
    <section className={`${CARD} xl:col-span-2`}>
      <div className="px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Recent announcements</h2>
      </div>
      {error ? <SectionError message="Unable to load announcements." onRetry={onRetry} /> : null}
      {!error && rows.length === 0 ? <p className="px-5 pb-6 text-sm text-slate-500">No announcements yet.</p> : null}
      {!error && rows.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-100 px-5 pb-2">
            {preview.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={item.href} className="text-sm font-medium text-slate-900 hover:text-violet-700">
                    {item.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </p>
              </li>
            ))}
          </ul>
          {rows.length > DASHBOARD_PREVIEW_COUNT ? <ViewMoreFooter href="/trainee/announcements" /> : null}
        </>
      ) : null}
    </section>
  );
}
