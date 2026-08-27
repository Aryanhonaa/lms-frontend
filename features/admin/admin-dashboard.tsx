"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  Users,
} from "lucide-react";
import { useAdminChrome } from "@/components/admin-shell";
import { Dialog } from "@/components/ui/dialog";
import { DASHBOARD_PREVIEW_COUNT, ViewMoreFooter } from "@/components/view-more-footer";
import { AdminPageHeader } from "@/features/admin/page-header";
import { getOperationsDashboard } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import type { ActivityItem, OperationsDashboard, OperationsPendingRow } from "@/types/admin";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

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

function formatSubmittedOn(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function matchesQuery(query: string, ...values: string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return values.some((value) => value.toLowerCase().includes(needle));
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
        {/* <p className={`mt-1 text-xs font-medium ${hintClass}`}>{hint}</p> */}
      </div>
    </section>
  );
}

function activityAccent(index: number): string {
  const palette = ["bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700"];
  return palette[index % palette.length];
}

export function AdminDashboard() {
  const { searchQuery } = useAdminChrome();
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOperationsDashboard()
      .then((payload) => {
        if (!cancelled) {
          setDashboard(payload.dashboard);
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
        matchesQuery(searchQuery, row.title, row.trainerName, row.status),
      ),
    [dashboard, searchQuery],
  );

  const activity = useMemo(
    () =>
      (dashboard?.recentActivity ?? []).filter((item) => matchesQuery(searchQuery, item.actorName, item.message)),
    [dashboard, searchQuery],
  );

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
        <AdminPageHeader title="Dashboard" subtitle="Operational overview of programs, trainers, and trainees." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={`${CARD} h-32 animate-pulse bg-slate-100/80`} />
          ))}
        </div>
      </div>
    );
  }

  const { metrics, traineeOverview } = dashboard;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" subtitle="Operational overview of programs, trainers, and trainees." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Programs"
          value={metrics.totalPrograms}
          hint={`${metrics.activePrograms} active`}
          hintClass="text-slate-500"
          icon={BookOpen}
          iconClass="bg-violet-100 text-violet-700"
        />
        <MetricCard
          label="Active Programs"
          value={metrics.activePrograms}
          hint="Approved or published"
          hintClass="text-emerald-600"
          icon={CheckCircle2}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Pending Approvals"
          value={metrics.pendingApprovals}
          hint="Submitted programs"
          hintClass="text-amber-600"
          icon={Clock3}
          iconClass="bg-pink-100 text-pink-700"
        />
        <MetricCard
          label="Trainers"
          value={metrics.trainers}
          hint="Program operators"
          hintClass="text-slate-500"
          icon={GraduationCap}
          iconClass="bg-sky-100 text-sky-700"
        />
        <MetricCard
          label="Trainees"
          value={metrics.trainees}
          hint={`${metrics.activeEnrollments} active enrollments`}
          hintClass="text-slate-500"
          icon={Users}
          iconClass="bg-violet-100 text-violet-700"
        />
        <MetricCard
          label="Active Enrollments"
          value={metrics.activeEnrollments}
          hint="Currently in a program"
          hintClass="text-emerald-600"
          icon={Users}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Completed Programs"
          value={metrics.completedPrograms}
          hint="Finished enrollments"
          hintClass="text-slate-500"
          icon={CheckCircle2}
          iconClass="bg-sky-100 text-sky-700"
        />
        <MetricCard
          label="Requiring Attention"
          value={metrics.traineesRequiringAttention}
          hint="Open intervention flags"
          hintClass="text-amber-600"
          icon={AlertCircle}
          iconClass="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className={`${CARD} overflow-hidden xl:col-span-3`}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Pending Program Approvals</h2>
            <Link href="/admin/approvals" className="text-sm font-medium text-violet-700 hover:text-violet-800">
              View all
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-slate-500">No pending approvals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Program</th>
                    <th className="px-3 py-2.5 font-medium">Trainer</th>
                    <th className="px-3 py-2.5 font-medium">Submitted Date</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((row) => (
                    <PendingRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${CARD} xl:col-span-2`}>
          <div className="px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Trainee Overview</h2>
          </div>
          <ul className="divide-y divide-slate-100 px-5 pb-4 text-sm">
            <OverviewStat label="Active trainees" value={traineeOverview.activeTrainees} />
            <OverviewStat label="Currently learning" value={traineeOverview.currentlyLearning} />
            <OverviewStat label="Completed trainees" value={traineeOverview.completedTrainees} />
            <OverviewStat label="Requiring attention" value={traineeOverview.requiringAttention} />
          </ul>
        </section>
      </div>

      <section className={CARD}>
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-slate-500">No recent activity yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 px-2 pb-2">
              {activity.slice(0, DASHBOARD_PREVIEW_COUNT).map((item, index) => (
                <ActivityRow key={item.id} item={item} index={index} />
              ))}
            </ul>
            {activity.length > DASHBOARD_PREVIEW_COUNT ? (
              <ViewMoreFooter onClick={() => setActivityOpen(true)} />
            ) : null}
          </>
        )}
      </section>
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
    </div>
  );
}

function PendingRow({ row }: { row: OperationsPendingRow }) {
  return (
    <tr className="text-slate-700">
      <td className="px-5 py-3 font-medium text-slate-900">{row.title}</td>
      <td className="px-3 py-3">{row.trainerName}</td>
      <td className="px-3 py-3 text-slate-500">{formatSubmittedOn(row.submittedAt)}</td>
      <td className="px-3 py-3">{row.status}</td>
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

function OverviewStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between py-3">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{formatNumber(value)}</span>
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
