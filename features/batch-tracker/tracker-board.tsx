"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Download, LayoutList, Search, Table2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getBatchTracker, type TrackerRole } from "@/lib/api/batch-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { BatchFunnel, LineOfBusiness, TrackerBatch, TrackerFilters, TrackerOverview } from "@/types/batch-tracker";
import { BatchStatusBadge, LobChip } from "./badges";
import {
  GLOSSARY,
  SHEET_COLUMNS,
  batchTitle,
  downloadCsv,
  formatDay,
  formatPct,
  monthBounds,
  sheetRow,
  trainerNames,
} from "./format";

type Props = {
  role: TrackerRole;
  basePath: string;
  emptyHint: string;
};

function filtersFrom(params: URLSearchParams): TrackerFilters & { month?: string } {
  const lob = params.get("lob");
  const status = params.get("status");
  return {
    q: params.get("q") ?? undefined,
    programId: params.get("programId") ?? undefined,
    trainerId: params.get("trainerId") ?? undefined,
    lineOfBusiness: lob === "VOICE" || lob === "NON_VOICE" ? lob : undefined,
    status: status === "UPCOMING" || status === "ONGOING" || status === "COMPLETED" ? status : undefined,
    month: params.get("month") ?? undefined,
  };
}

function Metric({
  label,
  value,
  detail,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  detail?: string;
  hint?: string;
  tone?: "slate" | "emerald" | "teal" | "violet";
}) {
  const valueTone = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    teal: "text-teal-700",
    violet: "text-violet-700",
  }[tone];
  return (
    <div className={`${cardClass} px-4 py-4`}>
      <p className="text-xs font-medium text-slate-500" title={hint}>
        <span className={hint ? "cursor-help underline decoration-slate-300 decoration-dotted underline-offset-4" : ""}>
          {label}
        </span>
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${valueTone}`}>{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{detail}</p> : null}
    </div>
  );
}

function FunnelInline({ funnel, status }: { funnel: BatchFunnel; status: TrackerBatch["status"] }) {
  const reached = status !== "UPCOMING";
  const steps = [
    { label: "Received", value: funnel.actualHc, show: true },
    { label: "Day 7", value: funnel.day7Hc, show: reached && funnel.day7Locked },
    { label: "Certified", value: funnel.certified, show: funnel.appeared > 0 },
    { label: "Handed over", value: funnel.handover, show: funnel.certified > 0 },
  ];
  return (
    <ol className="flex items-center gap-1.5 text-sm">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden /> : null}
          <span className="flex flex-col items-center leading-tight">
            <span className={`font-semibold tabular-nums ${step.show ? "text-slate-900" : "text-slate-300"}`}>
              {step.show ? step.value : "–"}
            </span>
            <span className="text-[10px] text-slate-400">{step.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function BatchProgress({ batch }: { batch: TrackerBatch }) {
  if (batch.status === "UPCOMING") {
    return <p className="text-sm text-slate-500">Starts {formatDay(batch.startDate)}</p>;
  }
  if (batch.status === "COMPLETED") {
    return <p className="text-sm text-slate-500">Completed {formatDay(batch.actualCompletionDate)}</p>;
  }
  if (!batch.startDate) {
    return <p className="text-sm text-slate-400">No start date</p>;
  }
  return (
    <div className="w-36">
      <p className="mb-1 text-xs text-slate-500 tabular-nums">
        Day {batch.trainingDay} of {batch.totalDays}
      </p>
      <ProgressBar value={(batch.trainingDay / batch.totalDays) * 100} tone="violet" />
    </div>
  );
}

function BatchRow({ batch, href }: { batch: TrackerBatch; href: string }) {
  const funnel = batch.funnel;
  return (
    <li>
      <Link
        href={href}
        className="grid gap-3 px-5 py-4 transition duration-150 hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_5rem] md:items-center md:gap-6"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{batchTitle(batch)}</span>
            <LobChip value={batch.lineOfBusiness} />
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">{batch.program.title}</p>
        </div>
        <p className="truncate text-sm text-slate-600">{trainerNames(batch)}</p>
        <BatchProgress batch={batch} />
        <FunnelInline funnel={funnel} status={batch.status} />
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatPct(funnel.throughputPct)}</p>
          <p className="text-[10px] text-slate-400">Throughput</p>
        </div>
        {funnel.handoverPending > 0 ? (
          <p className="text-xs text-amber-700 md:col-span-5 md:-mt-2">
            {funnel.handoverPending} certified {funnel.handoverPending === 1 ? "trainee is" : "trainees are"} waiting for
            handover
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function SheetView({ batches, basePath }: { batches: TrackerBatch[]; basePath: string }) {
  return (
    <div className={`${cardClass} overflow-x-auto`}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            {SHEET_COLUMNS.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`px-3 py-3 font-medium whitespace-nowrap ${index === 3 ? "sticky left-0 bg-white" : ""}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {batches.map((batch) => (
            <tr key={batch.id} className="hover:bg-slate-50/80">
              {sheetRow(batch).map((cell, index) => (
                <td
                  key={SHEET_COLUMNS[index]}
                  className={`px-3 py-2.5 whitespace-nowrap tabular-nums text-slate-700 ${
                    index === 3 ? "sticky left-0 bg-white font-medium" : ""
                  }`}
                >
                  {index === 3 ? (
                    <Link href={`${basePath}/${batch.id}`} className="text-violet-700 hover:underline">
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BatchTrackerBoard({ role, basePath, emptyHint }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFrom(new URLSearchParams(searchParams.toString())), [searchParams]);
  const view = searchParams.get("view") === "sheet" ? "sheet" : "list";
  const [data, setData] = useState<TrackerOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q ?? "");

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((filters.q ?? "") !== search.trim()) {
        setParam("q", search.trim() || undefined);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.q, search, setParam]);

  useEffect(() => {
    let cancelled = false;
    const bounds = filters.month ? monthBounds(filters.month) : null;
    getBatchTracker(role, {
      q: filters.q,
      programId: filters.programId,
      trainerId: filters.trainerId,
      lineOfBusiness: filters.lineOfBusiness,
      status: filters.status,
      from: bounds?.from,
      to: bounds?.to,
    })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load the batch tracker.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters, role]);

  const summary = data?.summary;
  const funnel = summary?.funnel;
  const hasFilters = Boolean(
    filters.q || filters.programId || filters.trainerId || filters.lineOfBusiness || filters.status || filters.month,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span className="sr-only">Batch start month</span>
          <input
            type="month"
            value={filters.month ?? ""}
            onChange={(event) => setParam("month", event.target.value || undefined)}
            className={`${fieldClass} w-auto py-2`}
          />
        </label>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {!data && !error ? <LoadingState label="Loading batches…" /> : null}

      {summary && funnel ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Summary">
            <Metric
              label="Active batches"
              value={summary.ongoing}
              detail={`${summary.batches} total · ${summary.completed} completed`}
            />
            <Metric
              label="Day 7 HC"
              value={funnel.day7Hc}
              detail={`of ${funnel.actualHc} received`}
              hint={GLOSSARY.day7Hc}
            />
            <Metric
              label="Certified"
              value={funnel.certified}
              detail={`${formatPct(funnel.certifiedPct)} of ${funnel.appeared} appeared`}
              hint={GLOSSARY.certified}
              tone="emerald"
            />
            <Metric
              label="Handed over"
              value={funnel.handover}
              detail={funnel.handoverPending > 0 ? `${funnel.handoverPending} pending` : "None pending"}
              hint={GLOSSARY.handover}
              tone="teal"
            />
            <Metric
              label="Throughput"
              value={formatPct(funnel.throughputPct)}
              detail="Certified ÷ Day 7 HC"
              hint={GLOSSARY.throughput}
              tone="violet"
            />
          </section>

          <section className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[14rem] flex-1">
              <span className="sr-only">Search batch code</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search batch code"
                className={`${fieldClass} pl-9`}
              />
            </label>
            <select
              aria-label="Program"
              value={filters.programId ?? ""}
              onChange={(event) => setParam("programId", event.target.value || undefined)}
              className={`${fieldClass} w-auto`}
            >
              <option value="">All programs</option>
              {data.filterOptions.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title}
                </option>
              ))}
            </select>
            {role === "admin" ? (
              <select
                aria-label="Trainer"
                value={filters.trainerId ?? ""}
                onChange={(event) => setParam("trainerId", event.target.value || undefined)}
                className={`${fieldClass} w-auto`}
              >
                <option value="">All trainers</option>
                {data.filterOptions.trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              aria-label="Status"
              value={filters.status ?? ""}
              onChange={(event) => setParam("status", event.target.value || undefined)}
              className={`${fieldClass} w-auto`}
            >
              <option value="">Any status</option>
              <option value="ONGOING">Ongoing</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setParam("view", view === "sheet" ? undefined : "sheet")}
                aria-pressed={view === "sheet"}
              >
                {view === "sheet" ? <LayoutList className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
                {view === "sheet" ? "List view" : "Sheet view"}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={data.batches.length === 0}
                onClick={() =>
                  downloadCsv(`batch-tracker-${data.today}.csv`, SHEET_COLUMNS, data.batches.map(sheetRow))
                }
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </section>

          {data.batches.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No batches match these filters" : "No batches yet"}
              description={hasFilters ? "Try a different month, type, or program." : emptyHint}
            />
          ) : view === "sheet" ? (
            <SheetView batches={data.batches} basePath={basePath} />
          ) : (
            <section className={`${cardClass} overflow-hidden`}>
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_5rem] gap-6 border-b border-slate-100 px-5 py-2.5 text-xs font-medium text-slate-400 md:grid">
                <span>Batch</span>
                <span>Trainers</span>
                <span className="w-36">Progress</span>
                <span>Funnel</span>
                <span className="text-right">Throughput</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.batches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} href={`${basePath}/${batch.id}`} />
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
