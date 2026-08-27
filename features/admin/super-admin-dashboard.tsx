"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock3,
  Eye,
  FileText,
  GraduationCap,
  Link2,
  Megaphone,
  PlayCircle,
  Users,
} from "lucide-react";
import { useAdminChrome } from "@/components/admin-shell";
import { Dialog } from "@/components/ui/dialog";
import { DASHBOARD_PREVIEW_COUNT, ViewMoreFooter } from "@/components/view-more-footer";
import { AdminPageHeader } from "@/features/admin/page-header";
import { getAdminDashboard, listAdminCalendar } from "@/lib/api/admin";
import { listAnnouncements } from "@/lib/api/engagement";
import { getCalendarSummary, getUpcomingEventGroups } from "@/lib/calendar/upcoming";
import { ApiClientError } from "@/lib/api/client";
import type { ActivityItem, AdminDashboard, MaterialType, PendingApprovalRow } from "@/types/admin";
import type { AnnouncementItem } from "@/types/engagement";
import type { CalendarEvent } from "@/types/calendar";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const EVENT_DOT: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-sky-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  green: "bg-emerald-500",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startNow - startDate) / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatUploadedOn(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function matchesQuery(query: string, ...values: string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return values.some((value) => value.toLowerCase().includes(needle));
}

function TypeIcon({ type }: { type: MaterialType }) {
  const className = "h-4 w-4";
  if (type === "VIDEO") {
    return <PlayCircle className={className} />;
  }
  if (type === "DOCUMENT") {
    return <FileText className={className} />;
  }
  if (type === "LINK") {
    return <Link2 className={className} />;
  }
  return <BookOpen className={className} />;
}

function MetricCard({
  label,
  value,
  hint,
  hintClass,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  hint: string;
  hintClass: string;
  icon: typeof BookOpen;
  iconClass: string;
}) {
  return (
    <section className={`${CARD} flex items-start gap-4 p-5`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatNumber(value)}</p>
        <p className={`mt-1 text-xs font-medium ${hintClass}`}>{hint}</p>
      </div>
    </section>
  );
}

function activityAccent(index: number): string {
  const palette = ["bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700"];
  return palette[index % palette.length];
}

export function SuperAdminDashboard() {
  const { searchQuery } = useAdminChrome();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [announcementRows, setAnnouncementRows] = useState<AnnouncementItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminDashboard(), listAnnouncements("admin"), listAdminCalendar().catch(() => ({ events: [] as CalendarEvent[] }))])
      .then(([payload, announcementPayload, calendarPayload]) => {
        if (!cancelled) {
          setDashboard(payload.dashboard);
          setAnnouncementRows(announcementPayload.announcements);
          setCalendarEvents(calendarPayload.events);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load dashboard");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = useMemo(
    () =>
      (dashboard?.pendingApprovals ?? []).filter((row) =>
        matchesQuery(searchQuery, row.title, row.course, row.trainerName, row.type),
      ),
    [dashboard, searchQuery],
  );

  const activity = useMemo(
    () =>
      (dashboard?.recentActivity ?? []).filter((item) => matchesQuery(searchQuery, item.actorName, item.message)),
    [dashboard, searchQuery],
  );

  const announcements = useMemo(
    () => announcementRows.filter((item) => matchesQuery(searchQuery, item.title, item.body)),
    [announcementRows, searchQuery],
  );
  const previewActivity = activity.slice(0, DASHBOARD_PREVIEW_COUNT);
  const previewAnnouncements = announcements.slice(0, DASHBOARD_PREVIEW_COUNT);

  const eventGroups = useMemo(() => getUpcomingEventGroups(calendarEvents), [calendarEvents]);
  const calendarSummary = useMemo(() => getCalendarSummary(calendarEvents), [calendarEvents]);

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard" subtitle="Overview of your platform." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${CARD} h-32 animate-pulse bg-slate-100/80`} />
          ))}
        </div>
      </div>
    );
  }

  const { metrics } = dashboard;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" subtitle="Overview of your platform." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Courses"
          value={metrics.courses.total}
          hint={`+${metrics.courses.addedThisMonth} this month`}
          hintClass="text-emerald-600"
          icon={BookOpen}
          iconClass="bg-violet-100 text-violet-700"
        />
        <MetricCard
          label="Trainees"
          value={metrics.trainees.total}
          hint={`+${metrics.trainees.addedThisMonth} this month`}
          hintClass="text-emerald-600"
          icon={GraduationCap}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Trainers"
          value={metrics.trainers.total}
          hint={`${metrics.trainers.pending} pending`}
          hintClass="text-amber-600"
          icon={Users}
          iconClass="bg-sky-100 text-sky-700"
        />
        <MetricCard
          label="Pending Approvals"
          value={metrics.pendingApprovals.total}
          hint="Programs"
          hintClass="text-slate-500"
          icon={Clock3}
          iconClass="bg-pink-100 text-pink-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className={`${CARD} overflow-hidden xl:col-span-3`}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Pending Material Approvals</h2>
            <Link href="/admin/approvals" className="text-sm font-medium text-violet-700 hover:text-violet-800">
              View all
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No programs are waiting for review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Material</th>
                    <th className="px-3 py-2.5 font-medium">Course</th>
                    <th className="px-3 py-2.5 font-medium">Trainer</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Uploaded On</th>
                    <th className="px-5 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((row) => (
                    <ApprovalRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${CARD} flex flex-col xl:col-span-2`}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Upcoming Events</h2>
            <Link href="/admin/calendar" className="text-sm font-medium text-violet-700 hover:text-violet-800">
              View calendar
            </Link>
          </div>
          <div className="flex-1 space-y-5 px-5 pb-4">
            {eventGroups.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming sessions, exams, or deadlines in the next two weeks.</p>
            ) : (
              eventGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{group.label}</p>
                  <ul className="mt-2 space-y-2">
                    {group.events.map((event) => (
                      <li key={event.id} className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2 w-2 rounded-full ${EVENT_DOT[event.color]}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">
                            {event.type} · {event.timeLabel}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 border-t border-slate-100 px-4 py-3 text-center">
            <SummaryStat label="Course Starts" value={calendarSummary.courseStarts} />
            <SummaryStat label="Sessions" value={calendarSummary.sessions} />
            <SummaryStat label="Exams" value={calendarSummary.exams} />
            <SummaryStat label="Deadlines" value={calendarSummary.deadlines} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className={`${CARD} xl:col-span-3`}>
          <div className="px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No recent activity yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 px-2 pb-2">
                {previewActivity.map((item, index) => (
                  <ActivityRow key={item.id} item={item} index={index} />
                ))}
              </ul>
              {activity.length > DASHBOARD_PREVIEW_COUNT ? (
                <ViewMoreFooter onClick={() => setActivityOpen(true)} />
              ) : null}
            </>
          )}
        </section>

        <section className={`${CARD} xl:col-span-2`}>
          <div className="px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Announcements</h2>
          </div>
          {announcements.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 px-2 pb-2">
                {previewAnnouncements.map((item) => (
                  <AnnouncementRow key={item.id} item={item} compact />
                ))}
              </ul>
              {announcements.length > DASHBOARD_PREVIEW_COUNT ? (
                <ViewMoreFooter onClick={() => setAnnouncementsOpen(true)} />
              ) : null}
            </>
          )}
        </section>
      </div>
      <Dialog open={activityOpen} title="Recent Activity" onClose={() => setActivityOpen(false)} wide>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((item, index) => (
              <ActivityRow key={item.id} item={item} index={index} />
            ))}
          </ul>
        )}
      </Dialog>
      <Dialog open={announcementsOpen} title="Recent Announcements" onClose={() => setAnnouncementsOpen(false)} wide>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {announcements.map((item) => (
              <AnnouncementRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

function ApprovalRow({ row }: { row: PendingApprovalRow }) {
  return (
    <tr className="text-slate-700">
      <td className="px-5 py-3 font-medium text-slate-900">{row.title}</td>
      <td className="px-3 py-3">{row.course}</td>
      <td className="px-3 py-3">{row.trainerName}</td>
      <td className="px-3 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <TypeIcon type={row.type} />
        </span>
      </td>
      <td className="px-3 py-3 text-slate-500">{formatUploadedOn(row.uploadedAt)}</td>
      <td className="px-5 py-3">
        <Link
          href="/admin/approvals"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          aria-label={`Review ${row.title}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

function audienceLabel(item: AnnouncementItem): string {
  if (item.audience === "PROGRAM") {
    return item.program?.title ?? "Program";
  }
  if (item.audience === "TRAINEES_SELECTED") {
    const batch = item.batch?.name ?? "Batch";
    const count = item.recipients?.length ?? 0;
    return count > 0 ? `${batch} · ${count} selected` : batch;
  }
  return item.audience.charAt(0) + item.audience.slice(1).toLowerCase();
}

function AnnouncementRow({ item, compact = false }: { item: AnnouncementItem; compact?: boolean }) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
        <Megaphone className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.title}</p>
        {compact ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
            <p className="mt-1.5 text-xs text-slate-400">
              {item.createdBy.name} · {audienceLabel(item)}
            </p>
          </>
        )}
      </div>
      <p className="shrink-0 text-xs text-slate-400">{formatActivityTime(item.createdAt)}</p>
    </li>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${activityAccent(index)}`}>
        {item.actorName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0] ?? "")
          .join("")
          .toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{item.message}</p>
      </div>
      <p className="shrink-0 text-xs text-slate-400">{formatActivityTime(item.occurredAt)}</p>
    </li>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-base font-semibold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
