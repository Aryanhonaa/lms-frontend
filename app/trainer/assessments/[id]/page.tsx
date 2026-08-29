"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { getTrainerAssessment } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { TrainerAssessmentRosterRow } from "@/types/assessment";

function statusLabel(status: string): string {
  if (status === "NOT_STARTED") {
    return "Not started";
  }
  if (status === "IN_PROGRESS") {
    return "In progress";
  }
  if (status === "TIMED_OUT") {
    return "Timed out";
  }
  return status.replaceAll("_", " ").toLowerCase();
}

function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${score}%`;
}

export default function TrainerAssessmentDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get("programId") ?? "";
  const urlBatchId = searchParams.get("batchId") ?? "";
  const [resolvedProgramId, setResolvedProgramId] = useState(urlProgramId);
  const filters = useTrainerCourseBatch({
    programId: urlProgramId || resolvedProgramId || undefined,
    batchId: urlBatchId || undefined,
  });
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getTrainerAssessment>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (urlProgramId || !params.id) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id)
      .then((data) => {
        if (!cancelled) {
          setResolvedProgramId(data.assessment.programId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, urlProgramId]);

  useEffect(() => {
    if (!params.id || !filters.ready || !filters.programId || !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id, { programId: filters.programId, batchId: filters.batchId })
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setResolvedProgramId(data.assessment.programId);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, filters.ready, filters.programId, filters.batchId]);

  function onProgramChange(programId: string) {
    if (programId === filters.programId) {
      return;
    }
    router.push(`/trainer/assessments?programId=${encodeURIComponent(programId)}`);
  }

  function onBatchChange(batchId: string) {
    filters.setBatchId(batchId);
    const next = new URLSearchParams();
    if (filters.programId) {
      next.set("programId", filters.programId);
    }
    next.set("batchId", batchId);
    router.replace(`${pathname}?${next.toString()}`);
  }

  if (!user) {
    return null;
  }

  const roster: TrainerAssessmentRosterRow[] = payload?.roster ?? [];
  const selectedBatch = filters.batches.find((row) => row.id === filters.batchId);
  const loadError = error ?? filters.error;
  const questions = payload?.assessment.questions ?? [];

  return (
    <TrainerShell title={payload?.assessment.title ?? "Quiz"} user={user} crumbLabel={payload?.assessment.title}>
      <div className="mb-4">
        <TrainerCourseBatchFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          hideProgram
          onProgramChange={onProgramChange}
          onBatchChange={onBatchChange}
        />
      </div>
      {loadError ? <ErrorState message={loadError} /> : null}
      {!payload && !loadError ? <LoadingState label="Loading results…" /> : null}
      {filters.ready && filters.batches.length === 0 && !loadError ? (
        <EmptyState title="No batches yet." description="Create a batch for this course to review quiz results." />
      ) : null}
      {payload ? (
        <section className="border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 text-sm text-zinc-600 dark:border-zinc-800">
            {payload.assessment.programTitle} · {selectedBatch?.name} · {payload.assessment.location} ·{" "}
            {payload.assessment.questionBankCount > payload.assessment.questionCount
              ? `${payload.assessment.questionCount} of ${payload.assessment.questionBankCount} questions`
              : `${payload.assessment.questionCount} questions`}{" "}
            · pass {payload.assessment.passingScore}%
          </div>
          {roster.length === 0 ? (
            <EmptyState
              title="No trainees enrolled in this batch."
              description="Enroll trainees in this batch to collect quiz attempts."
            />
          ) : (
            roster.map((row) => {
              const latest = row.latest;
              const answerMap = new Map((latest?.answers ?? []).map((answer) => [answer.questionId, answer]));
              return (
                <article key={row.enrollmentId} className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setOpenId((current) => (current === row.enrollmentId ? null : row.enrollmentId))}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{row.trainee.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {latest?.submittedAt ? new Date(latest.submittedAt).toLocaleString() : "—"}
                        {latest ? ` · attempt ${latest.attemptNumber}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-slate-800">{statusLabel(row.status)}</p>
                      <p className="mt-1 text-slate-500">
                        {formatScore(latest?.score)}
                        {latest?.passed === true ? " · passed" : latest?.passed === false ? " · failed" : ""}
                      </p>
                    </div>
                  </button>
                  {openId === row.enrollmentId ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {!latest || latest.status === "IN_PROGRESS" || latest.status === "NOT_STARTED" ? (
                        <p className="text-sm text-slate-500">
                          {latest?.status === "IN_PROGRESS"
                            ? "This trainee still has an attempt in progress."
                            : "No submitted paper yet."}
                        </p>
                      ) : (
                        <ol className="grid gap-3">
                          {questions.map((question, index) => {
                            const answer = answerMap.get(question.id);
                            const selected = question.options.filter((option) =>
                              (answer?.selectedOptionIds ?? []).includes(option.id),
                            );
                            const correct = question.options.filter((option) => option.isCorrect);
                            return (
                              <li key={question.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                                <p className="font-medium text-slate-900">
                                  {index + 1}. {question.prompt}
                                </p>
                                <p className={`mt-1 ${answer?.isCorrect ? "text-emerald-700" : "text-red-600"}`}>
                                  {answer ? (answer.isCorrect ? "Correct" : "Incorrect") : "Unanswered"}
                                  {answer ? ` · ${answer.pointsAwarded}/${question.points} pt` : ""}
                                </p>
                                <p className="mt-1 text-slate-600">
                                  Their answer: {selected.length ? selected.map((option) => option.label).join(", ") : "—"}
                                </p>
                                <p className="mt-1 text-slate-600">
                                  Correct answer: {correct.map((option) => option.label).join(", ") || "—"}
                                </p>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </TrainerShell>
  );
}
