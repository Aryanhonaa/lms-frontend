"use client";

import { ArrowRight, CheckCircle2, Clock3, Inbox, PenLine, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { getGradingQueue } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { GradingQueue, GradingQueueItem, GradingQueueView } from "@/types/assessment";

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

function timeAgo(value: string | null): string {
  if (!value) {
    return "—";
  }
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function waitingFor(value: string | null): string {
  if (!value) {
    return "—";
  }
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) {
    return "< 1 h";
  }
  if (hours < 24) {
    return `${hours} h`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function isStale(item: GradingQueueItem): boolean {
  return Boolean(item.submittedAt && Date.now() - new Date(item.submittedAt).getTime() > STALE_AFTER_MS);
}

function gradeHref(item: GradingQueueItem): string {
  const query = new URLSearchParams({ programId: item.programId, open: item.enrollmentId, from: "grading" });
  if (item.batch) {
    query.set("batchId", item.batch.id);
  }
  return `/trainer/assessments/${item.quiz.id}?${query.toString()}`;
}

type QueueGroup = {
  key: string;
  quiz: GradingQueueItem["quiz"];
  programTitle: string;
  batchName: string | null;
  items: GradingQueueItem[];
};

function groupByQuiz(items: GradingQueueItem[]): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  for (const item of items) {
    const key = `${item.quiz.id}:${item.batch?.id ?? "none"}`;
    const group = groups.get(key) ?? {
      key,
      quiz: item.quiz,
      programTitle: item.programTitle,
      batchName: item.batch?.name ?? null,
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function StatTile({
  label,
  value,
  hint,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "slate" | "amber" | "emerald";
  icon: typeof Inbox;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-600";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-950/5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        {hint ? <p className="truncate text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function TrainerGradingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: GradingQueueView = searchParams.get("view") === "graded" ? "graded" : "pending";
  const programId = searchParams.get("programId") ?? "";
  const queryKey = `${view}:${programId}`;
  const [loaded, setLoaded] = useState<{ key: string; queue: GradingQueue } | null>(null);
  const data = loaded?.key === queryKey ? loaded.queue : null;
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    getGradingQueue({ view, programId: programId || undefined })
      .then((next) => {
        if (cancelled) {
          return;
        }
        setLoaded({ key: `${view}:${programId}`, queue: next });
        setError(null);
        if (!programId) {
          const seen = new Map<string, string>();
          for (const item of next.items) {
            seen.set(item.programId, item.programTitle);
          }
          setCourses((current) => {
            const merged = new Map(current.map((course) => [course.id, course.title]));
            for (const [id, title] of seen) {
              merged.set(id, title);
            }
            return [...merged].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load the grading queue");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view, programId]);

  function updateQuery(next: { view?: GradingQueueView; programId?: string }) {
    const query = new URLSearchParams(searchParams.toString());
    const nextView = next.view ?? view;
    const nextProgram = next.programId ?? programId;
    if (nextView === "graded") {
      query.set("view", "graded");
    } else {
      query.delete("view");
    }
    if (nextProgram) {
      query.set("programId", nextProgram);
    } else {
      query.delete("programId");
    }
    const suffix = query.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname);
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!needle) {
      return items;
    }
    return items.filter((item) =>
      [item.trainee.name, item.trainee.email, item.quiz.title, item.programTitle, item.batch?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [data, search]);
  const groups = useMemo(() => groupByQuiz(filtered), [filtered]);

  if (!user) {
    return null;
  }

  const summary = data?.summary;
  const firstUp = view === "pending" ? (filtered[0] ?? null) : null;

  return (
    <TrainerShell title="To grade" user={user}>
      <div className="flex flex-col gap-5">
        <section className={`${cardClass} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Quiz answers waiting for you</h2>
              <p className="mt-1 text-sm text-slate-500">
                Every written answer your trainees submit lands here, across all your courses and batches. Oldest first.
              </p>
            </div>
            {firstUp ? (
              <Link href={gradeHref(firstUp)} className={primaryButtonClass}>
                <PenLine className="h-4 w-4" />
                Start grading
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              icon={Inbox}
              label="Waiting for you"
              value={summary?.pending ?? "—"}
              tone={(summary?.pending ?? 0) > 0 ? "amber" : "slate"}
            />
            <StatTile
              icon={Clock3}
              label="Oldest waiting"
              value={summary?.oldestPendingAt ? waitingFor(summary.oldestPendingAt) : "—"}
              hint={summary?.oldestPendingAt ? `Submitted ${timeAgo(summary.oldestPendingAt)}` : undefined}
            />
            <StatTile
              icon={CheckCircle2}
              label="Graded this week"
              value={summary?.gradedThisWeek ?? "—"}
              tone="emerald"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Queue view" className="inline-flex rounded-xl bg-slate-100 p-1">
              {(
                [
                  { id: "pending", label: "Waiting", count: summary?.pending },
                  { id: "graded", label: "Graded this week", count: summary?.gradedThisWeek },
                ] as const
              ).map((tab) => {
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => updateQuery({ view: tab.id })}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined ? (
                      <span
                        className={`rounded-full px-1.5 text-[11px] ${
                          active && tab.id === "pending" && tab.count > 0
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Course"
                className={`${fieldClass} sm:w-56`}
                value={programId}
                onChange={(event) => updateQuery({ programId: event.target.value })}
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <label className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search trainee, quiz or batch"
                  aria-label="Search the queue"
                  className={`${fieldClass} pl-9`}
                />
              </label>
            </div>
          </div>
        </section>

        {error ? <ErrorState message={error} /> : null}
        {!data && !error ? <LoadingState label="Loading the queue…" /> : null}

        {data && groups.length === 0 ? (
          <section className={`${cardClass} px-6 py-14 text-center`}>
            {view === "pending" && !search ? (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Sparkles className="h-6 w-6" />
                </span>
                <p className="mt-3 text-base font-semibold text-slate-900">All caught up</p>
                <p className="mt-1 text-sm text-slate-500">
                  No quiz answers are waiting for your grade. New submissions will show up here automatically.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {search ? "Nothing matches your search." : "Nothing graded in the last 7 days."}
              </p>
            )}
          </section>
        ) : null}

        {groups.map((group) => (
          <section key={group.key} className={`${cardClass} overflow-hidden`}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{group.quiz.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {group.programTitle}
                  {group.batchName ? ` · ${group.batchName}` : ""} · {group.quiz.location} · pass {group.quiz.passingScore}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                {view === "pending" ? (
                  <>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                      {group.items.length} waiting
                    </span>
                    <Link href={gradeHref(group.items[0])} className={secondaryButtonClass}>
                      Grade this quiz
                    </Link>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {group.items.length} graded
                  </span>
                )}
              </div>
            </header>
            <ul className="divide-y divide-slate-100">
              {group.items.map((item) => {
                const stale = view === "pending" && isStale(item);
                return (
                  <li key={item.attemptId}>
                    <Link
                      href={gradeHref(item)}
                      className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-violet-50/40"
                    >
                      <UserAvatar name={item.trainee.name} avatarUrl={item.trainee.avatarUrl} size="row" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                          <span className="truncate">{item.trainee.name}</span>
                          {item.attemptNumber > 1 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Attempt {item.attemptNumber}
                            </span>
                          ) : null}
                          {item.status === "TIMED_OUT" ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              Timed out
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {view === "pending"
                            ? `${item.pendingAnswerCount} written answer${item.pendingAnswerCount === 1 ? "" : "s"} to grade`
                            : `${item.writtenAnswerCount} written answer${item.writtenAnswerCount === 1 ? "" : "s"}`}
                          {" · "}
                          <span className={stale ? "font-medium text-amber-700" : ""}>
                            {view === "pending"
                              ? `submitted ${timeAgo(item.submittedAt)}`
                              : `graded ${timeAgo(item.gradedAt)}`}
                          </span>
                        </p>
                      </div>
                      {view === "pending" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-violet-600/20 transition group-hover:bg-violet-700">
                          <PenLine className="h-3.5 w-3.5" />
                          Grade
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.passed === true
                                ? "bg-emerald-50 text-emerald-700"
                                : item.passed === false
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.score === null ? "—" : `${item.score}%`}
                            {item.passed === true ? " · passed" : item.passed === false ? " · failed" : ""}
                          </span>
                          <span className="text-xs font-medium text-violet-700 group-hover:underline">Review</span>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </TrainerShell>
  );
}
