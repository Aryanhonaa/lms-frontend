"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Search, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ProgramReview } from "@/features/approvals/program-review";
import { approveProgram, getAdminProgram, listAdminPrograms, rejectProgram } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { programStatusLabel } from "@/lib/programs/enrollment";
import { RequiredMark } from "@/components/ui/required-mark";
import type { ProgramStatus } from "@/types/domain";
import type { ProgramSummary, ProgramTree } from "@/types/program";

const FILTERS: Array<{ id: ProgramStatus | "ALL"; label: string }> = [
  { id: "SUBMITTED", label: "Pending" },
  { id: "REJECTED", label: "Rejected" },
  { id: "APPROVED", label: "Approved" },
  { id: "ALL", label: "All" },
];

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

export function ApprovalsBoard() {
  const [filter, setFilter] = useState<ProgramStatus | "ALL">("SUBMITTED");
  const [query, setQuery] = useState("");
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProgramTree | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    listAdminPrograms(filter === "ALL" ? undefined : filter)
      .then((payload) => {
        if (!cancelled) {
          setPrograms(payload.programs);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load approvals");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingList(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    setLoadingProgram(true);
    getAdminProgram(selectedId)
      .then((payload) => {
        if (!cancelled) {
          setSelected(payload.program);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load program");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProgram(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return programs;
    }
    return programs.filter((program) =>
      `${program.title} ${program.createdBy.name} ${program.category}`.toLowerCase().includes(needle),
    );
  }, [programs, query]);

  async function run(action: () => Promise<{ program: ProgramTree }>) {
    setBusy(true);
    setError(null);
    try {
      const payload = await action();
      setSelected(payload.program);
      setReason("");
      const list = await listAdminPrograms(filter === "ALL" ? undefined : filter);
      setPrograms(list.programs);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const filterLabel = FILTERS.find((item) => item.id === filter)?.label ?? "Queue";

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Queue
              <span className="ml-2 font-medium text-slate-500 normal-case tracking-normal">
                {loadingList ? "…" : `${visible.length} ${filter === "ALL" ? "programs" : filterLabel.toLowerCase()}`}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === item.id
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => {
                    setFilter(item.id);
                    setSelectedId(null);
                    setSelected(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex w-full max-w-xs items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-violet-300 sm:w-72">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search title or trainer"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {error ? <p className="px-4 pt-3 text-sm text-red-600">{error}</p> : null}
        {loadingList ? (
          <p className="px-4 py-8 text-sm text-slate-500">Loading queue…</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">No programs in this queue.</p>
        ) : (
          <div className="relative">
            <ul className="flex gap-3 overflow-x-auto scroll-smooth px-4 py-3 snap-x snap-mandatory [scrollbar-width:thin]">
              {visible.map((program) => {
                const active = selectedId === program.id;
                const weeks = program._count?.weeks ?? 0;
                return (
                  <li key={program.id} className="w-64 shrink-0 snap-start">
                    <button
                      type="button"
                      aria-pressed={active}
                      className={`flex h-full w-full flex-col gap-2 rounded-xl border px-3.5 py-3 text-left transition ${
                        active
                          ? "border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedId(program.id)}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className={`line-clamp-2 min-w-0 text-sm font-semibold leading-5 ${active ? "text-violet-950" : "text-slate-900"}`}>
                          {program.title}
                        </span>
                        <span className="shrink-0">
                          <StatusBadge status={program.status} />
                        </span>
                      </span>
                      <span className="mt-auto truncate text-xs text-slate-500">
                        {program.createdBy.name} · {weeks} {weeks === 1 ? "week" : "weeks"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Updated {new Date(program.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="min-w-0">
        {!selectedId ? (
          <div className={`${CARD} flex flex-col items-center px-8 py-16 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <ClipboardCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">Select a program to review</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Open the full course — lessons, readings, videos, quizzes — then approve or send it back.
            </p>
          </div>
        ) : loadingProgram || !selected ? (
          <div className={`${CARD} px-8 py-16 text-sm text-slate-500`}>Loading course materials…</div>
        ) : (
          <div className="flex flex-col gap-4">
            {selected.status === "SUBMITTED" ? (
              <div className={`${CARD} px-5 py-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Decision</p>
                    <p className="text-xs text-slate-500">Review the materials below, then approve or reject.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void run(() => approveProgram(selected.id))}
                  >
                    <Check className="h-4 w-4" />
                    Approve program
                  </button>
                </div>
                <label className="mt-4 block text-sm">
                  <span className="font-medium text-slate-800">
                    Rejection reason
                    <RequiredMark />
                  </span>
                  <textarea
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Required if you send this back to the trainer"
                  />
                </label>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={busy || reason.trim().length === 0}
                  onClick={() => void run(() => rejectProgram(selected.id, reason.trim()))}
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            ) : (
              <div className={`${CARD} px-5 py-3 text-sm text-slate-600`}>
                Status: {programStatusLabel(selected.status)}. Materials below are still available to inspect.
              </div>
            )}
            <ProgramReview program={selected} />
          </div>
        )}
      </section>
    </div>
  );
}
