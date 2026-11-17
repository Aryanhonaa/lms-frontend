"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTrainerAssignments } from "@/lib/api/assignments";
import { listProgramBatches, type ProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { listTrainerPrograms } from "@/lib/api/programs";
import { fieldClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { RecentAssignmentSubmission, TrainerAssignmentSummary } from "@/types/assignment";
import type { ProgramSummary } from "@/types/program";

export default function TrainerAssignmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [batchId, setBatchId] = useState(searchParams.get("batchId") ?? "");
  const [programId, setProgramId] = useState(searchParams.get("programId") ?? "");
  const [assignments, setAssignments] = useState<TrainerAssignmentSummary[]>([]);
  const [recent, setRecent] = useState<RecentAssignmentSubmission[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTrainerPrograms()
      .then(async ({ programs: rows }) => {
        const responses = await Promise.allSettled(rows.map((program) => listProgramBatches(program.id)));
        if (cancelled) return;
        const byId = new Map<string, ProgramBatch>();
        responses.forEach((response) => {
          if (response.status === "fulfilled") {
            response.value.batches.forEach((batch) => byId.set(batch.id, batch));
          }
        });
        const nextBatches = [...byId.values()].sort((a, b) =>
          (b.startDate ?? b.createdAt).localeCompare(a.startDate ?? a.createdAt),
        );
        setPrograms(rows);
        setBatches(nextBatches);
        setBatchId((current) => current || nextBatches[0]?.id || "");
        if (!nextBatches.length) {
          setContentLoading(false);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assignment workspace");
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBatch = batches.find((batch) => batch.id === batchId);
  const courseIds = useMemo(() => {
    if (!selectedBatch) return [];
    const ids = selectedBatch.courses?.map((course) => course.id) ?? [];
    return ids.length ? ids : [selectedBatch.programId];
  }, [selectedBatch]);
  const batchPrograms = useMemo(
    () => programs.filter((program) => courseIds.includes(program.id)),
    [courseIds, programs],
  );
  const effectiveProgramId = courseIds.includes(programId) ? programId : (courseIds[0] ?? "");

  useEffect(() => {
    if (!effectiveProgramId || !batchId) {
      return;
    }
    let cancelled = false;
    listTrainerAssignments({ programId: effectiveProgramId, batchId })
      .then((payload) => {
        if (!cancelled) {
          setAssignments(payload.assignments);
          setRecent(payload.recentSubmissions ?? []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : "Unable to load assignments");
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, effectiveProgramId]);

  function updateUrl(nextBatchId: string, nextProgramId: string) {
    const query = new URLSearchParams({ batchId: nextBatchId, programId: nextProgramId });
    router.replace(`${pathname}?${query.toString()}`);
  }

  function chooseBatch(nextBatchId: string) {
    const batch = batches.find((item) => item.id === nextBatchId);
    const nextProgramId = batch?.courses?.[0]?.id ?? batch?.programId ?? "";
    setContentLoading(true);
    setBatchId(nextBatchId);
    setProgramId(nextProgramId);
    updateUrl(nextBatchId, nextProgramId);
  }

  function chooseCourse(nextProgramId: string) {
    setContentLoading(true);
    setProgramId(nextProgramId);
    updateUrl(batchId, nextProgramId);
  }

  if (!user) return null;

  const selectedCourse = programs.find((program) => program.id === effectiveProgramId);

  return (
    <TrainerShell title="Assignments" user={user}>
      <div className="space-y-5">
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-violet-300 uppercase">Review workspace</p>
              <h2 className="mt-2 text-xl font-semibold">Choose a batch, then a course</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                See every assignment and jump straight to the newest trainee work.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[34rem]">
              <label className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
                1. Batch
                <select
                  className={`${fieldClass} mt-1.5 bg-white font-normal text-slate-900 normal-case`}
                  value={batchId}
                  disabled={!batches.length}
                  onChange={(event) => chooseBatch(event.target.value)}
                >
                  {!batches.length ? <option value="">No batches available</option> : null}
                  {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
                2. Course
                <select
                  className={`${fieldClass} mt-1.5 bg-white font-normal text-slate-900 normal-case`}
                  value={effectiveProgramId}
                  disabled={!batchPrograms.length}
                  onChange={(event) => chooseCourse(event.target.value)}
                >
                  {!batchPrograms.length ? <option value="">No courses in this batch</option> : null}
                  {batchPrograms.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>

        {error ? <ErrorState message={error} /> : null}
        {catalogLoading || contentLoading ? (
          <section className="rounded-2xl bg-white px-5 ring-1 ring-slate-950/5">
            <LoadingState label="Loading assignments…" />
          </section>
        ) : null}
        {!catalogLoading && !batches.length && !error ? (
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
            <EmptyState title="No batches available" description="Create a batch before reviewing submissions." />
          </section>
        ) : null}

        {!contentLoading && recent.length ? (
          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-950/5">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Clock3 className="h-4 w-4 text-violet-600" /> Recently submitted
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">Newest submissions appear first.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {recent.length} recent
              </span>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {recent.map((submission) => {
                const pending = submission.status === "SUBMITTED";
                return (
                  <Link
                    key={submission.id}
                    href={`/trainer/assignments/${submission.assignmentId}?programId=${submission.programId}&batchId=${batchId}&submissionId=${submission.id}`}
                    className="group rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{submission.trainee.name}</p>
                        <p className="mt-0.5 truncate text-sm text-slate-600">{submission.assignmentTitle}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        pending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {pending ? "To review" : "Reviewed"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {new Date(submission.submittedAt).toLocaleString()} · attempt {submission.revision}
                    </p>
                    {submission.gradedBy ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marked by {submission.gradedBy.name}
                      </p>
                    ) : (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-700">
                        Review now <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {!contentLoading && batchId && effectiveProgramId ? (
          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-950/5">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-violet-600" /> All assignments
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{selectedCourse?.title} · {selectedBatch?.name}</p>
              </div>
              <span className="text-sm font-medium text-slate-500">{assignments.length} total</span>
            </div>
            {!assignments.length ? (
              <div className="px-5 py-8">
                <EmptyState
                  title="No assignments in this course"
                  description="Add an assignment to a day in the program builder. It will appear here for this batch."
                />
              </div>
            ) : (
              <ul className="grid gap-3 p-4 md:grid-cols-2">
                {assignments.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/trainer/assignments/${item.id}?programId=${effectiveProgramId}&batchId=${batchId}`}
                      className="group flex h-full flex-col rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        {item.pendingReview ? (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            {item.pendingReview} to review
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.location}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                        <span className="text-slate-500">{item.submissionCount} submitted</span>
                        <span className="flex items-center gap-1 font-medium text-violet-700">
                          View <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </TrainerShell>
  );
}
