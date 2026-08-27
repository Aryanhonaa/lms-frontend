"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UsageChart } from "@/features/app-usage/usage-chart";
import { formatDuration, shiftYmd, todayYmd } from "@/features/app-usage/format";
import { getAdminAppUsage, getTrainerAppUsage, getTraineeAppUsage } from "@/lib/api/app-usage";
import { ApiClientError } from "@/lib/api/client";
import type { AppUsageAnalytics, AppUsagePeriod } from "@/types/app-usage";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const SELECT =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition duration-150 hover:border-slate-300 focus-visible:border-violet-400";

type Audience = "admin" | "trainer" | "trainee";

function loadAnalytics(audience: Audience, query: Parameters<typeof getAdminAppUsage>[0]) {
  if (audience === "admin") {
    return getAdminAppUsage(query);
  }
  if (audience === "trainer") {
    return getTrainerAppUsage(query);
  }
  return getTraineeAppUsage(query);
}

export function AppUsagePanel({ audience }: { audience: Audience }) {
  const [period, setPeriod] = useState<AppUsagePeriod>("daily");
  const [date, setDate] = useState(todayYmd());
  const [programId, setProgramId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<AppUsageAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAnalytics(audience, {
      period,
      date,
      programId: programId || undefined,
      batchId: batchId || undefined,
      traineeIds: audience === "trainee" ? undefined : selectedIds.length > 0 ? selectedIds : undefined,
    })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setAnalytics(payload.analytics);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setAnalytics(null);
        setError(err instanceof ApiClientError ? "Unable to load usage analytics." : "Unable to load usage analytics.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience, period, date, programId, batchId, selectedIds, refreshKey]);

  const batches = useMemo(
    () => (analytics?.filters.batches ?? []).filter((row) => !programId || row.programId === programId),
    [analytics, programId],
  );
  const traineeOptions = analytics?.filters.trainees ?? [];
  const visibleTrainees = traineeOptions.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()));

  const chart = useMemo(() => {
    if (!analytics) {
      return { labels: [] as string[], series: [] as Array<{ id: string; name: string; values: number[] }> };
    }
    const isDailyComparison = analytics.mode === "comparison" && period === "daily";
    if (isDailyComparison) {
      return {
        labels: analytics.trainees.map((row) => row.name),
        series: [{ id: "usage", name: "Usage time", values: analytics.trainees.map((row) => row.seconds) }],
      };
    }
    return {
      labels: analytics.buckets.map((bucket) => (period === "weekly" ? bucket.label.slice(0, 3) : bucket.label)),
      series: analytics.trainees.map((row) => ({
        id: row.id,
        name: row.name,
        values: analytics.buckets.map((bucket) => row.buckets.find((item) => item.key === bucket.key)?.seconds ?? 0),
      })),
    };
  }, [analytics, period]);

  const empty = Boolean(analytics && analytics.summary.totalSeconds === 0 && analytics.summary.activeTrainees === 0);
  const dayCount = analytics
    ? Math.max(1, Math.round((new Date(analytics.range.end).getTime() - new Date(analytics.range.start).getTime()) / 86_400_000))
    : 1;
  const averageSeconds =
    audience === "trainee" && analytics ? Math.round(analytics.summary.totalSeconds / dayCount) : analytics?.summary.averageSeconds ?? 0;

  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">App Usage Time</h2>
          <p className="mt-1 text-sm text-slate-500">
            {audience === "trainee"
              ? "How long you have been actively using the LMS."
              : "Active LMS time for trainees in your scope."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="usage-period">
            Period
          </label>
          <select
            id="usage-period"
            className={SELECT}
            value={period}
            onChange={(event) => setPeriod(event.target.value as AppUsagePeriod)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Previous period"
              onClick={() => setDate((value) => shiftYmd(value, period, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[9.5rem] text-center text-sm font-medium text-slate-800">{analytics?.range.label ?? "—"}</p>
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Next period"
              onClick={() => setDate((value) => shiftYmd(value, period, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {audience !== "trainee" && analytics ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase">
            Course
            <select
              className={`${SELECT} mt-1 w-full font-normal normal-case`}
              value={programId}
              onChange={(event) => {
                setProgramId(event.target.value);
                setBatchId("");
              }}
            >
              <option value="">All courses</option>
              {analytics.filters.programs.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase">
            Batch
            <select
              className={`${SELECT} mt-1 w-full font-normal normal-case`}
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
            >
              <option value="">All batches</option>
              {batches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Trainees</p>
            <input
              className={`${SELECT} mt-1 w-full font-normal`}
              value={search}
              placeholder="Search trainee..."
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-slate-100 px-2 py-1">
              <label className="flex items-center gap-2 py-1 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedIds.length === 0}
                  onChange={() => setSelectedIds([])}
                />
                All trainees
              </label>
              {visibleTrainees.map((row) => (
                <label key={row.id} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => {
                      setSelectedIds((current) => {
                        const next = current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id];
                        return next;
                      });
                    }}
                  />
                  {row.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>Unable to load usage analytics.</p>
          <p className="mt-1 text-red-700">Please try again.</p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-red-950 underline decoration-red-300 underline-offset-2"
            onClick={() => {
              setError(null);
              setRefreshKey((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 sm:col-span-2 xl:col-span-4" />
        </div>
      ) : null}

      {!loading && analytics && !error ? (
        <>
          <div className={`mt-5 grid gap-3 ${audience === "trainee" ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            <SummaryCard label="Total active time" value={empty ? "—" : formatDuration(analytics.summary.totalSeconds)} />
            <SummaryCard
              label={audience === "trainee" ? "Average per day" : "Average per trainee"}
              value={empty ? "—" : formatDuration(averageSeconds)}
            />
            {audience !== "trainee" ? (
              <>
                <SummaryCard label="Most active" value={analytics.summary.mostActive?.name ?? "—"} />
                <SummaryCard label="Active trainees" value={empty ? "—" : String(analytics.summary.activeTrainees)} />
              </>
            ) : null}
          </div>

          <div className="mt-6">
            {empty ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
                <p className="text-sm font-medium text-slate-900">No usage data available</p>
                <p className="mt-2 text-sm text-slate-500">There isn't enough activity data for this period yet.</p>
              </div>
            ) : (
              <UsageChart labels={chart.labels} series={chart.series} mode={analytics.mode} />
            )}
            {analytics.truncated ? (
              <p className="mt-2 text-xs text-slate-500">Showing the most active trainees. Search to compare specific people.</p>
            ) : null}
          </div>

          {!empty && (period === "weekly" || period === "monthly") ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
                    <th className="py-2 pr-3 font-medium">Trainee</th>
                    {analytics.buckets.map((bucket) => (
                      <th key={bucket.key} className="px-2 py-2 font-medium">
                        {period === "weekly" ? bucket.label.slice(0, 3) : bucket.label}
                      </th>
                    ))}
                    <th className="py-2 pl-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.trainees.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium text-slate-800">{row.name}</td>
                      {row.buckets.map((bucket) => (
                        <td key={bucket.key} className="px-2 py-2 text-slate-600">
                          {formatDuration(bucket.seconds)}
                        </td>
                      ))}
                      <td className="py-2 pl-3 text-slate-800">{formatDuration(row.seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-950/5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
