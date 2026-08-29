"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ListChecks,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getTrainerDashboard } from "@/lib/api/trainer";
import { ApiClientError } from "@/lib/api/client";
import type { AuthUser } from "@/types/api";
import type { CalendarEventType } from "@/types/calendar";
import type {
  DashboardRange,
  TrainerAttentionItem,
  TrainerDashboard,
  TrainerDashboardProgram,
  TrainerRecentSubmission,
  TrainerUpcomingEvent,
} from "@/types/trainer-dashboard";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const EVENT_STYLE: Record<CalendarEventType, { wrap: string; icon: typeof CalendarDays }> = {
  SESSION: { wrap: "bg-violet-50 text-violet-700", icon: CalendarDays },
  EXAM: { wrap: "bg-sky-50 text-sky-700", icon: ClipboardCheck },
  ASSIGNMENT: { wrap: "bg-amber-50 text-amber-700", icon: ListChecks },
  MILESTONE: { wrap: "bg-fuchsia-50 text-fuchsia-700", icon: GraduationCap },
  DEADLINE: { wrap: "bg-rose-50 text-rose-700", icon: AlertTriangle },
  PROGRAM: { wrap: "bg-emerald-50 text-emerald-700", icon: BookOpen },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? name;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "TR";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function programAccent(id: string): string {
  const palette = ["bg-slate-800", "bg-violet-700", "bg-indigo-700", "bg-fuchsia-800", "bg-sky-800"];
  let hash = 0;
  for (const char of id) {
    hash = (hash + char.charCodeAt(0)) % palette.length;
  }
  return palette[hash] ?? palette[0];
}

function formatEventWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function submissionStatus(row: TrainerRecentSubmission): { label: string; className: string } {
  if (row.status === "SUBMITTED") {
    return { label: row.isLate ? "Pending · Late" : "Pending", className: "bg-amber-50 text-amber-800" };
  }
  if (row.status === "GRADED" || row.status === "COMPLETED") {
    return { label: row.status === "COMPLETED" ? "Completed" : "Graded", className: "bg-emerald-50 text-emerald-800" };
  }
  if (row.status === "CHANGES_REQUESTED") {
    return { label: "Changes requested", className: "bg-sky-50 text-sky-800" };
  }
  return { label: row.status.replaceAll("_", " ").toLowerCase(), className: "bg-slate-100 text-slate-700" };
}

function attentionLabel(trigger: string): string {
  return trigger === "PROGRESS_BELOW_THRESHOLD" ? "Low progress" : "Low exam score";
}

export function TrainerDashboard({ user }: { user: AuthUser }) {
  const [range, setRange] = useState<DashboardRange>("week");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState<TrainerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTrainerDashboard(range)
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
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {firstName(user.name)}! Here&apos;s what&apos;s happening with your programs.
          </p>
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
            Unable to load dashboard statistics.
          </p>
          <button
            type="button"
            className="mt-3 rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition duration-150 hover:bg-violet-700 disabled:opacity-60"
            onClick={retryPage}
          >
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`${CARD} h-28 animate-pulse bg-slate-100/80`} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className={`${CARD} h-72 animate-pulse bg-slate-100/80 xl:col-span-3`} />
        <div className={`${CARD} h-72 animate-pulse bg-slate-100/80 xl:col-span-2`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className={`${CARD} h-64 animate-pulse bg-slate-100/80 xl:col-span-3`} />
        <div className={`${CARD} h-64 animate-pulse bg-slate-100/80 xl:col-span-2`} />
      </div>
    </div>
  );
}

function DashboardBody({ dashboard, onRetry }: { dashboard: TrainerDashboard; onRetry: () => void }) {
  const { statistics, errors } = dashboard;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {errors.statistics ? (
          <div className={`${CARD} p-5 sm:col-span-2 xl:col-span-5`}>
            <SectionError message="Unable to load dashboard statistics." onRetry={onRetry} />
          </div>
        ) : (
          <>
            <StatCard
              href="/trainer/programs"
              label="Programs"
              value={statistics.programs.total}
              hint={`${formatNumber(statistics.programs.active)} active`}
              hintClass="text-slate-500"
              icon={BookOpen}
              iconClass="bg-violet-100 text-violet-700"
            />
            <StatCard
              href="/trainer/programs"
              label="Trainees"
              value={statistics.trainees.total}
              hint="Across your programs"
              hintClass="text-emerald-600"
              icon={Users}
              iconClass="bg-emerald-100 text-emerald-700"
            />
            <StatCard
              href="/trainer/interventions"
              label="Need help"
              value={statistics.pendingReviews.total}
              hint="Trainees below your alert line"
              hintClass="text-amber-600"
              icon={AlertTriangle}
              iconClass="bg-amber-100 text-amber-700"
            />
            <StatCard
              href="/trainer/calendar"
              label="Upcoming quizzes"
              value={statistics.upcomingAssessments.total}
              hint="In this range"
              hintClass="text-sky-700"
              icon={ClipboardCheck}
              iconClass="bg-sky-100 text-sky-700"
            />
            <StatCard
              href="/trainer/assignments"
              label="Pending Submissions"
              value={statistics.pendingSubmissions.total}
              hint="Waiting to grade"
              hintClass="text-rose-600"
              icon={ListChecks}
              iconClass="bg-rose-100 text-rose-700"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className={`${CARD} overflow-hidden xl:col-span-3`}>
          <SectionHeader title="My Programs" href="/trainer/programs" linkLabel="View all" />
          {errors.programs ? (
            <div className="px-5 pb-5">
              <SectionError message="Unable to load programs." onRetry={onRetry} />
            </div>
          ) : dashboard.programs.length === 0 ? (
            <EmptyCopy
              title="No programs yet"
              description="Create a program to start enrolling trainees and tracking progress."
              href="/trainer/programs/new"
              action="Create program"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Program</th>
                    <th className="px-3 py-2.5 font-medium">Trainees</th>
                    <th className="min-w-[140px] px-3 py-2.5 font-medium">Progress</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.programs.map((program) => (
                    <ProgramRow key={program.id} program={program} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${CARD} flex flex-col xl:col-span-2`}>
          <SectionHeader title="Upcoming" href="/trainer/calendar" linkLabel="View calendar" />
          {errors.upcoming ? (
            <div className="px-5 pb-5">
              <SectionError message="Unable to load upcoming events." onRetry={onRetry} />
            </div>
          ) : dashboard.upcoming.length === 0 ? (
            <EmptyCopy title="No upcoming events" description="Quizzes, exams, sessions, and deadlines in this range will show up here." />
          ) : (
            <ul className="flex-1 space-y-1 px-2 pb-3">
              {dashboard.upcoming.map((event) => (
                <UpcomingRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className={`${CARD} overflow-hidden xl:col-span-3`}>
          <SectionHeader title="Recent Submissions" href="/trainer/assignments" linkLabel="View all" />
          {errors.submissions ? (
            <div className="px-5 pb-5">
              <SectionError message="Unable to load submissions." onRetry={onRetry} />
            </div>
          ) : dashboard.recentSubmissions.length === 0 ? (
            <EmptyCopy title="No recent submissions" description="When trainees submit assignments in this range, they will appear here for review." />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Trainee</th>
                      <th className="px-3 py-2.5 font-medium">Program</th>
                      <th className="px-3 py-2.5 font-medium">Assignment</th>
                      <th className="px-3 py-2.5 font-medium">Submitted</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.recentSubmissions.map((row) => (
                      <SubmissionRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {dashboard.recentSubmissions.map((row) => (
                  <SubmissionCard key={row.id} row={row} />
                ))}
              </ul>
            </>
          )}
        </section>

        <section className={`${CARD} xl:col-span-2`}>
          <SectionHeader title="Trainees who need help" href="/trainer/interventions" linkLabel="View all" />
          {errors.attention ? (
            <div className="px-5 pb-5">
              <SectionError message="Unable to load alerts." onRetry={onRetry} />
            </div>
          ) : dashboard.attention.length === 0 ? (
            <EmptyCopy title="All caught up" description="No trainees currently need help." />
          ) : (
            <ul className="divide-y divide-slate-100 px-2 pb-2">
              {dashboard.attention.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>
      </div>
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
  value: number;
  hint: string;
  hintClass: string;
  icon: typeof BookOpen;
  iconClass: string;
}) {
  return (
    <Link
      href={href}
      className={`${CARD} flex items-start gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-violet-200`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatNumber(value)}</p>
        <p className={`mt-1 text-xs font-medium ${hintClass}`}>{hint}</p>
      </div>
    </Link>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <Link href={href} className="text-sm font-medium text-violet-700 transition duration-150 hover:text-violet-800">
        {linkLabel}
      </Link>
    </div>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{message}</p>
      <button type="button" className="mt-2 font-medium text-red-950 underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function EmptyCopy({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="px-5 pb-6">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {href && action ? (
        <Link href={href} className="mt-3 inline-block text-sm font-medium text-violet-700 hover:text-violet-800">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function ProgramRow({ program }: { program: TrainerDashboardProgram }) {
  return (
    <tr className="text-slate-700 transition duration-150 hover:bg-slate-50/80">
      <td className="px-5 py-3">
        <Link href={program.href} className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${programAccent(program.id)}`}>
            {program.title.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-slate-900">{program.title}</span>
            <span className="block text-xs text-slate-500">
              {program.category} · {program.durationWeeks} weeks
            </span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-3">
        <p>{formatNumber(program.traineeCount)}</p>
        {program.outcomeCounts ? (
          <p className="text-xs text-slate-500">
            {program.outcomeCounts.inProgress} in progress · {program.outcomeCounts.completed} completed · {program.outcomeCounts.failed} failed
          </p>
        ) : null}
      </td>
      <td className="px-3 py-3">
        {program.progress === null ? (
          <span className="text-xs text-slate-400">No trainees</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-[72px] flex-1">
              <ProgressBar value={program.progress} tone="violet" />
            </div>
            <span className="w-8 text-xs font-medium text-slate-600">{program.progress}%</span>
          </div>
        )}
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={program.status} />
      </td>
    </tr>
  );
}

function UpcomingRow({ event }: { event: TrainerUpcomingEvent }) {
  const style = EVENT_STYLE[event.type];
  const Icon = style.icon;
  return (
    <li>
      <Link
        href={event.href}
        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition duration-150 hover:bg-slate-50"
      >
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.wrap}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{event.title}</span>
          <span className="block text-xs text-slate-500">{event.program.title}</span>
        </span>
        <span className="shrink-0 text-right text-xs text-slate-500">{formatEventWhen(event.startsAt)}</span>
      </Link>
    </li>
  );
}

function SubmissionRow({ row }: { row: TrainerRecentSubmission }) {
  const status = submissionStatus(row);
  return (
    <tr className="text-slate-700 transition duration-150 hover:bg-slate-50/80">
      <td className="px-5 py-3">
        <Link href={row.href} className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
            {initialsFromName(row.trainee.name)}
          </span>
          <span className="font-medium text-slate-900">{row.trainee.name}</span>
        </Link>
      </td>
      <td className="px-3 py-3">{row.program.title}</td>
      <td className="px-3 py-3">{row.assignment.title}</td>
      <td className="px-3 py-3 text-slate-500">{formatSubmittedAt(row.submittedAt)}</td>
      <td className="px-5 py-3">
        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
      </td>
    </tr>
  );
}

function SubmissionCard({ row }: { row: TrainerRecentSubmission }) {
  const status = submissionStatus(row);
  return (
    <li>
      <Link href={row.href} className="block px-5 py-3 transition duration-150 hover:bg-slate-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
              {initialsFromName(row.trainee.name)}
            </span>
            <span className="text-sm font-medium text-slate-900">{row.trainee.name}</span>
          </div>
          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{row.assignment.title}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {row.program.title} · {formatSubmittedAt(row.submittedAt)}
        </p>
      </Link>
    </li>
  );
}

function AttentionRow({ item }: { item: TrainerAttentionItem }) {
  return (
    <li>
      <Link href={item.href} className="flex items-start gap-3 rounded-xl px-3 py-3 transition duration-150 hover:bg-slate-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{item.trainee.name}</span>
          <span className="block text-xs text-slate-500">
            {item.program.title} · {attentionLabel(item.trigger)}
          </span>
        </span>
      </Link>
    </li>
  );
}
