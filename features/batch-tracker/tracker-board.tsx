"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutList,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateBatchDialog } from "@/features/batch-tracker/create-batch-dialog";
import { DeleteBatchDialog } from "@/features/batch-tracker/delete-batch-dialog";
import { EnrollTraineesDialog } from "@/features/trainer/enroll-trainees-dialog";
import { getBatchTracker, type TrackerRole } from "@/lib/api/batch-tracker";
import type { ProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { BatchFunnel, TrackerBatch, TrackerFilters, TrackerOverview } from "@/types/batch-tracker";
import { BatchStatusBadge, LobChip } from "./badges";
import {
  GLOSSARY,
  SHEET_COLUMNS,
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

const BATCH_LIST_COLS =
  "md:grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,1fr)_9rem_13rem_5.5rem_2.5rem] md:gap-6";

function FunnelInline({ funnel, status }: { funnel: BatchFunnel; status: TrackerBatch["status"] }) {
  const reached = status !== "UPCOMING";
  const steps = [
    { label: "Received", value: funnel.actualHc, show: true },
    { label: "Day 7", value: funnel.day7Hc, show: reached && funnel.day7Locked },
    { label: "Certified", value: funnel.certified, show: funnel.appeared > 0 },
    { label: "Handed over", value: funnel.handover, show: funnel.certified > 0 },
  ];
  return (
    <ol className="grid w-[13rem] grid-cols-4 items-start gap-1 text-sm">
      {steps.map((step) => (
        <li key={step.label} className="min-w-0 text-center leading-tight">
          <span className={`block font-semibold tabular-nums ${step.show ? "text-slate-900" : "text-slate-300"}`}>
            {step.show ? step.value : "–"}
          </span>
          <span className="block truncate text-[10px] text-slate-400">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function BatchProgress({ batch }: { batch: TrackerBatch }) {
  let body: ReactNode;
  if (batch.status === "UPCOMING") {
    body = <p className="text-sm text-slate-500">Starts {formatDay(batch.startDate)}</p>;
  } else if (batch.status === "COMPLETED") {
    body = <p className="text-sm text-slate-500">Completed {formatDay(batch.actualCompletionDate)}</p>;
  } else if (!batch.startDate) {
    body = <p className="text-sm text-slate-400">No start date</p>;
  } else {
    body = (
      <>
        <p className="mb-1 text-xs text-slate-500 tabular-nums">
          Day {batch.trainingDay} of {batch.totalDays}
        </p>
        <ProgressBar value={(batch.trainingDay / batch.totalDays) * 100} tone="violet" />
      </>
    );
  }
  return <div className="w-36 min-w-0">{body}</div>;
}

function BatchRow({
  batch,
  href,
  canDelete,
  onDelete,
}: {
  batch: TrackerBatch;
  href: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const funnel = batch.funnel;
  return (
    <li className="group relative">
      <Link
        href={href}
        className={`grid gap-3 px-5 py-4 transition duration-150 hover:bg-slate-50/80 md:items-center ${BATCH_LIST_COLS}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{batch.name}</span>
            <LobChip value={batch.lineOfBusiness} />
            <BatchStatusBadge status={batch.status} />
          </div>
          {batch.code ? (
            <p className="mt-0.5 font-mono text-xs font-medium tracking-wide text-violet-700">{batch.code}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(batch.courses?.length ? batch.courses : [batch.program]).map((course, index) => (
              <span
                key={course.id}
                className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                <span className="font-semibold text-violet-700">{course.label ?? `${index + 1}`}</span>
                {course.title}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {batch.funnel.actualHc} trainee{batch.funnel.actualHc === 1 ? "" : "s"}
          </p>
        </div>
        <p className="min-w-0 truncate text-sm text-slate-600">{trainerNames(batch)}</p>
        <BatchProgress batch={batch} />
        <FunnelInline funnel={funnel} status={batch.status} />
        <div className="w-[5.5rem] text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-900">{formatPct(funnel.throughputPct)}</p>
        </div>
        <span className="hidden w-10 md:block" aria-hidden />
        {funnel.handoverPending > 0 ? (
          <p className="text-xs text-amber-700 md:col-span-6 md:-mt-2">
            {funnel.handoverPending} certified {funnel.handoverPending === 1 ? "trainee is" : "trainees are"} waiting for
            handover
          </p>
        ) : null}
      </Link>
      {canDelete ? (
        <button
          type="button"
          title="Delete batch"
          aria-label={`Delete ${batch.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
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
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFrom(new URLSearchParams(searchParams.toString())), [searchParams]);
  const view = searchParams.get("view") === "sheet" ? "sheet" : "list";
  const [data, setData] = useState<TrackerOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollBatch, setEnrollBatch] = useState<ProgramBatch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrackerBatch | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canCreate = role === "trainer" && Boolean(user);

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
  }, [filters, reloadKey, role]);

  const summary = data?.summary;
  const funnel = summary?.funnel;
  const hasFilters = Boolean(
    filters.q || filters.programId || filters.trainerId || filters.lineOfBusiness || filters.status || filters.month,
  );

  const programLabel =
    data?.filterOptions.programs.find((program) => program.id === filters.programId)?.title ?? null;
  const trainerLabel =
    data?.filterOptions.trainers.find((trainer) => trainer.id === filters.trainerId)?.name ?? null;
  const statusLabel =
    filters.status === "ONGOING"
      ? "Ongoing"
      : filters.status === "UPCOMING"
        ? "Upcoming"
        : filters.status === "COMPLETED"
          ? "Completed"
          : null;
  const lobLabel =
    filters.lineOfBusiness === "VOICE" ? "Voice" : filters.lineOfBusiness === "NON_VOICE" ? "Non-voice" : null;
  const monthLabel = filters.month
    ? new Date(`${filters.month}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" })
    : null;

  const activeChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (filters.q) {
    activeChips.push({ key: "q", label: `Code: ${filters.q}`, onClear: () => { setSearch(""); setParam("q", undefined); } });
  }
  if (programLabel) {
    activeChips.push({ key: "programId", label: programLabel, onClear: () => setParam("programId", undefined) });
  }
  if (trainerLabel) {
    activeChips.push({ key: "trainerId", label: trainerLabel, onClear: () => setParam("trainerId", undefined) });
  }
  if (statusLabel) {
    activeChips.push({ key: "status", label: statusLabel, onClear: () => setParam("status", undefined) });
  }
  if (lobLabel) {
    activeChips.push({
      key: "lob",
      label: lobLabel,
      onClear: () => setParam("lob", undefined),
    });
  }
  if (monthLabel) {
    activeChips.push({ key: "month", label: monthLabel, onClear: () => setParam("month", undefined) });
  }

  function clearAllFilters() {
    setSearch("");
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["q", "programId", "trainerId", "status", "lob", "month"]) {
      next.delete(key);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {canCreate ? (
          <p className="max-w-xl text-sm text-slate-500">
            Start with a batch: pick approved courses, invite co-trainers, then enroll trainees.
          </p>
        ) : (
          <p className="max-w-xl text-sm text-slate-500">Track batch progress, headcount, and handover across courses.</p>
        )}
        {canCreate ? (
          <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create batch
          </button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p>
      ) : null}
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

          <section className={`${cardClass} overflow-hidden`} aria-label="Filters">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Find batches</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.batches.length} result{data.batches.length === 1 ? "" : "s"}
                  {hasFilters ? " with current filters" : " in this view"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setParam("view", undefined)}
                    aria-pressed={view === "list"}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      view === "sheet" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() => setParam("view", "sheet")}
                    aria-pressed={view === "sheet"}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Sheet
                  </button>
                </div>
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
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-12">
              <label className="block md:col-span-2 xl:col-span-4">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Batch code
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="e.g. NHT-OCT26-03"
                    className={`${fieldClass} pr-9 pl-9`}
                  />
                  {search ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => {
                        setSearch("");
                        setParam("q", undefined);
                      }}
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              </label>

              <label className="block md:col-span-1 xl:col-span-3">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Course
                </span>
                <span className="relative block">
                  <select
                    value={filters.programId ?? ""}
                    onChange={(event) => setParam("programId", event.target.value || undefined)}
                    className={`${fieldClass} appearance-none pr-9`}
                  >
                    <option value="">All batches</option>
                    {data.filterOptions.programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </span>
              </label>

              {role === "admin" ? (
                <label className="block md:col-span-1 xl:col-span-3">
                  <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    Trainer
                  </span>
                  <span className="relative block">
                    <select
                      value={filters.trainerId ?? ""}
                      onChange={(event) => setParam("trainerId", event.target.value || undefined)}
                      className={`${fieldClass} appearance-none pr-9`}
                    >
                      <option value="">All trainers</option>
                      {data.filterOptions.trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </span>
                </label>
              ) : null}

              <label className={`block md:col-span-1 ${role === "admin" ? "xl:col-span-2" : "xl:col-span-5"}`}>
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Start month
                </span>
                <span className="relative block">
                  <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="month"
                    value={filters.month ?? ""}
                    onChange={(event) => setParam("month", event.target.value || undefined)}
                    className={`${fieldClass} pl-9`}
                  />
                </span>
              </label>

              <div className={`block ${role === "admin" ? "md:col-span-2 xl:col-span-12" : "md:col-span-2 xl:col-span-12"}`}>
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Status
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Batch status">
                  {(
                    [
                      { value: "", label: "All" },
                      { value: "ONGOING", label: "Ongoing" },
                      { value: "UPCOMING", label: "Upcoming" },
                      { value: "COMPLETED", label: "Completed" },
                    ] as const
                  ).map((option) => {
                    const active = (filters.status ?? "") === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setParam("status", option.value || undefined)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="block md:col-span-2 xl:col-span-12">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Line of business
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Line of business">
                  {(
                    [
                      { value: "", label: "All types" },
                      { value: "VOICE", label: "Voice" },
                      { value: "NON_VOICE", label: "Non-voice" },
                    ] as const
                  ).map((option) => {
                    const active = (filters.lineOfBusiness ?? "") === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setParam("lob", option.value || undefined)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                <span className="text-xs font-medium text-slate-500">Active</span>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onClear}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {chip.label}
                    <X className="h-3 w-3 text-slate-400" aria-hidden />
                    <span className="sr-only">Remove {chip.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear all
                </button>
              </div>
            ) : null}
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
              <div
                className={`hidden border-b border-slate-100 px-5 py-2.5 text-xs font-medium text-slate-400 md:grid md:items-center ${BATCH_LIST_COLS}`}
              >
                <span>Batch</span>
                <span>Trainers</span>
                <span className="w-36">Progress</span>
                <span className="w-[13rem]">Funnel</span>
                <span className="w-[5.5rem] text-right">Throughput</span>
                <span className="sr-only">Actions</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.batches.map((batch) => (
                  <BatchRow
                    key={batch.id}
                    batch={batch}
                    href={`${basePath}/${batch.id}`}
                    canDelete={role === "trainer"}
                    onDelete={() => setDeleteTarget(batch)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}

      <DeleteBatchDialog
        open={Boolean(deleteTarget)}
        batch={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          setNotice("Batch deleted.");
          setReloadKey((key) => key + 1);
        }}
      />

      {canCreate && user ? (
        <>
          <CreateBatchDialog
            open={createOpen}
            currentUserId={user.id}
            onClose={() => setCreateOpen(false)}
            onCreated={(batch) => {
              setCreateOpen(false);
              setEnrollBatch(batch);
              setReloadKey((key) => key + 1);
            }}
          />
          {enrollBatch ? (
            <EnrollTraineesDialog
              open
              programId={enrollBatch.programId}
              programTitle={enrollBatch.courses?.map((course) => course.title).join(" · ") || "Courses"}
              batchId={enrollBatch.id}
              batchName={enrollBatch.name}
              onClose={() => setEnrollBatch(null)}
              onEnrolled={() => setReloadKey((key) => key + 1)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
