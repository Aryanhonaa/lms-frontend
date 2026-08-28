"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TraineeCourseFilters } from "@/components/trainee-course-filters";
import { TraineeShell } from "@/components/trainee-shell";
import { getTraineeLearnView } from "@/lib/api/learning";
import { ApiClientError } from "@/lib/api/client";
import { traineeContinueHref, traineePathHref } from "@/lib/learning/path";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { useAuth } from "@/providers/auth-provider";
import type { LearnView } from "@/types/learning";

function ProgramOverview() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("programId") ?? "";
  const requestedBatch = searchParams.get("batchId") ?? "";
  const filters = useTraineeEnrollment({
    programId: requestedId || undefined,
    batchId: requestedBatch || undefined,
  });
  const [view, setView] = useState<LearnView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replaceScope(programId: string, batchId: string) {
    const params = new URLSearchParams();
    params.set("programId", programId);
    if (batchId) {
      params.set("batchId", batchId);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (!filters.ready || !filters.programId) {
      return;
    }
    if (filters.batches.length > 0 && !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTraineeLearnView(filters.programId, filters.batchId || undefined)
      .then((payload) => {
        if (!cancelled) {
          setView(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load program");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.ready, filters.programId, filters.batchId]);

  if (!user) {
    return null;
  }

  const loadError = error ?? filters.error;

  return (
    <TraineeShell title={view?.program.title ?? "Your Journey"} user={user}>
      <div className="mb-4">
        <TraineeCourseFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          onProgramChange={(id) => {
            filters.setProgramId(id);
            const firstBatch = filters.enrollments.find((row) => row.program.id === id)?.batch?.id ?? "";
            replaceScope(id, firstBatch);
          }}
          onBatchChange={(id) => {
            filters.setBatchId(id);
            replaceScope(filters.programId, id);
          }}
        />
      </div>
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {filters.ready && filters.enrollments.length === 0 && !loadError ? (
        <p className="text-sm text-slate-500">You&apos;re not in a course yet.</p>
      ) : null}
      {view ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
            <div className="bg-gradient-to-br from-violet-50 via-white to-white px-5 py-5">
              <p className="text-sm text-slate-600">{view.program.description}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Where you are</dt>
                  <dd className="mt-1 font-medium text-slate-900">{view.currentWeek?.title ?? "Ready when you are"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Today</dt>
                  <dd className="mt-1 font-medium text-slate-900">{view.currentDay?.title ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Progress</dt>
                  <dd className="mt-2">
                    <ProgressBar value={view.progress.percent} tone="violet" size="md" />
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {view.nextActivity ? (
                  <Link
                    href={traineeContinueHref(view.program.id, view.nextActivity, filters.batchId)}
                    className={primaryButtonClass}
                  >
                    Continue Learning
                  </Link>
                ) : (
                  <Link
                    href={traineePathHref(view.program.id, null, filters.batchId)}
                    className={primaryButtonClass}
                  >
                    Open Learn
                  </Link>
                )}
                <Link href="/trainee" className={secondaryButtonClass}>
                  Home
                </Link>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">Your Journey</div>
            <ul className="divide-y divide-slate-100">
              {view.weeks.map((week) => (
                <li key={week.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-slate-900">{week.title}</p>
                    <span className="text-[11px] font-semibold tracking-wide text-slate-400">
                      {week.status === "LOCKED" ? "Locked" : week.status === "COMPLETED" ? "Done" : "In progress"}
                    </span>
                  </div>
                  {week.reason ? <p className="mt-1 text-sm text-slate-500">{week.reason}</p> : null}
                  <ul className="mt-3 space-y-2">
                    {week.days.map((day) => (
                      <li key={day.id}>
                        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{day.title}</p>
                        <ul className="mt-1 space-y-1">
                          {day.items.map((item) => (
                            <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-slate-800">{item.title}</span>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                {item.status === "LOCKED" ? "Locked" : item.status === "COMPLETED" ? "Done" : "Up next"}
                              </span>
                            </li>
                          ))}
                          {(day.assignments ?? [])
                            .filter((item) => item.linkedItemId && day.items.some((file) => file.id === item.linkedItemId))
                            .map((item) => (
                            <li key={`assignment-${item.id}`} className="flex items-center justify-between gap-3 pl-4 text-sm">
                              <span className="truncate text-slate-800">{item.title}</span>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                Assignment · {item.status === "LOCKED" ? "Locked" : item.status === "COMPLETED" ? "Done" : "Up next"}
                              </span>
                            </li>
                          ))}
                          {(day.quizzes ?? []).map((item) => (
                            <li key={`quiz-${item.id}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-slate-800">{item.title}</span>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                Quiz · {item.status === "LOCKED" ? "Locked" : item.status === "PASSED" || item.status === "COMPLETED" ? "Done" : "Up next"}
                              </span>
                            </li>
                          ))}
                          {(day.assignments ?? [])
                            .filter((item) => !item.linkedItemId || !day.items.some((file) => file.id === item.linkedItemId))
                            .map((item) => (
                            <li key={`assignment-${item.id}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate text-slate-800">{item.title}</span>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                Assignment · {item.status === "LOCKED" ? "Locked" : item.status === "COMPLETED" ? "Done" : "Up next"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </TraineeShell>
  );
}

export default function TraineeProgramPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-zinc-600">Loading program…</p>}>
      <ProgramOverview />
    </Suspense>
  );
}
