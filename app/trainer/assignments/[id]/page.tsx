"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { getTrainerAssignment, reviewAssignmentSubmission } from "@/lib/api/assignments";
import { FileActionsRow } from "@/components/files/file-viewer";
import { getAttachmentAccess, getSubmissionFileAccess } from "@/lib/api/files";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { RequiredMark } from "@/components/ui/required-mark";
import { useAuth } from "@/providers/auth-provider";
import type { TrainerRosterRow, TrainerSubmission } from "@/types/assignment";

function statusLabel(status: string): string {
  if (status === "NOT_STARTED") {
    return "Not submitted";
  }
  if (status === "SUBMITTED") {
    return "To review";
  }
  return status.replaceAll("_", " ").toLowerCase();
}

export default function TrainerAssignmentDetailPage() {
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
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getTrainerAssignment>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const scope = filters.programId && filters.batchId ? { programId: filters.programId, batchId: filters.batchId } : undefined;

  useEffect(() => {
    if (urlProgramId || !params.id) {
      return;
    }
    let cancelled = false;
    getTrainerAssignment(params.id)
      .then((data) => {
        if (!cancelled) {
          setResolvedProgramId(data.assignment.programId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assignment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, urlProgramId]);

  useEffect(() => {
    if (!params.id || !filters.ready || !scope) {
      return;
    }
    let cancelled = false;
    getTrainerAssignment(params.id, scope)
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setResolvedProgramId(data.assignment.programId);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assignment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, filters.ready, filters.programId, filters.batchId]);

  function onBatchChange(batchId: string) {
    filters.setBatchId(batchId);
    const next = new URLSearchParams();
    if (filters.programId) {
      next.set("programId", filters.programId);
    }
    next.set("batchId", batchId);
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function review(
    submission: TrainerSubmission,
    status: "GRADED" | "CHANGES_REQUESTED" | "COMPLETED",
    form: HTMLFormElement,
  ) {
    const data = new FormData(form);
    setBusyId(submission.id);
    setError(null);
    try {
      await reviewAssignmentSubmission(submission.id, {
        status,
        score: data.get("score") ? Number(data.get("score")) : undefined,
        comment: String(data.get("comment") ?? ""),
      });
      const next = await getTrainerAssignment(payload!.assignment.id, scope);
      setPayload(next);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to save review");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return null;
  }

  const roster: TrainerRosterRow[] = payload?.roster ?? [];
  const selectedBatch = filters.batches.find((row) => row.id === filters.batchId);
  const loadError = error ?? filters.error;

  return (
    <TrainerShell title={payload?.assignment.title ?? "Assignment"} user={user} crumbLabel={payload?.assignment.title}>
      <div className="mb-4">
        <TrainerCourseBatchFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          programDisabled
          onProgramChange={filters.setProgramId}
          onBatchChange={onBatchChange}
        />
      </div>
      {loadError ? <ErrorState message={loadError} /> : null}
      {!payload && !loadError ? <LoadingState label="Loading submissions…" /> : null}
      {filters.ready && filters.batches.length === 0 && !loadError ? (
        <EmptyState title="No batches yet." description="Create a batch for this course to review submissions." />
      ) : null}
      {payload ? (
        <section className="grid gap-4">
          <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-slate-950/5">
            <p className="text-sm text-slate-500">
              {payload.assignment.programTitle} · {selectedBatch?.name} · {payload.assignment.location}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {payload.roster.filter((row) => row.status !== "NOT_STARTED").length} submissions · max{" "}
              {payload.assignment.maxScore} points
            </p>
            {payload.assignment.attachments?.length ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Attachments</p>
                <ul className="mt-2 space-y-2">
                  {payload.assignment.attachments.map((attachment) => (
                    <li key={attachment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <FileActionsRow
                        loader={() => getAttachmentAccess("trainer", attachment.id)}
                        fileName={attachment.title || attachment.fileName}
                        fileSize={attachment.fileSize}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {roster.length === 0 ? (
            <EmptyState
              title="No trainees enrolled in this batch."
              description="Enroll trainees in this batch to collect submissions."
            />
          ) : (
            roster.map((row) => {
              const latest = row.latest;
              const submission = payload.submissions.find((item) => item.id === latest?.id);
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
                        {latest?.isLate ? " · submitted late" : ""}
                        {latest ? ` · attempt ${latest.revision}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium tracking-wide text-slate-600 uppercase">
                      {statusLabel(row.status)}
                    </span>
                  </button>
                  {openId === row.enrollmentId && submission ? (
                    <form
                      className="mt-4 border-t border-slate-100 pt-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void review(submission, "GRADED", event.currentTarget);
                      }}
                    >
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{submission.body || "No text response."}</p>
                      {(submission.files ?? latest?.files ?? []).length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {(submission.files ?? latest?.files ?? []).map((file) => (
                            <li key={file.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                              <FileActionsRow
                                loader={() => getSubmissionFileAccess("trainer", submission.id, file.id)}
                                fileName={file.fileName}
                                fileSize={file.fileSize}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No files uploaded.</p>
                      )}
                      {row.attempts.length > 1 ? (
                        <div className="mt-3 text-xs text-slate-500">
                          {row.attempts.length} attempts kept
                          {row.attempts
                            .filter((attempt) => attempt.id !== submission.id)
                            .map((attempt) => (
                              <p key={attempt.id}>
                                Attempt {attempt.revision}: {statusLabel(attempt.status)}
                                {attempt.score !== null ? ` · ${attempt.score}/${payload.assignment.maxScore}` : ""}
                              </p>
                            ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">No previous attempts.</p>
                      )}
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="text-sm font-medium text-slate-800">
                          Score
                          <RequiredMark />
                          <input
                            name="score"
                            type="number"
                            min={0}
                            max={payload.assignment.maxScore}
                            defaultValue={submission.score ?? ""}
                            placeholder={`0 – ${payload.assignment.maxScore}`}
                            className={`${fieldClass} mt-1`}
                            disabled={busyId === submission.id}
                            aria-label={`Score out of ${payload.assignment.maxScore}`}
                          />
                        </label>
                        <label className="text-sm font-medium text-slate-800 md:col-span-2">
                          Feedback
                          <textarea
                            name="comment"
                            rows={4}
                            defaultValue={submission.trainerComment}
                            placeholder="Visible to the trainee"
                            className={`${fieldClass} mt-1`}
                            disabled={busyId === submission.id}
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="submit" className={primaryButtonClass} disabled={busyId === submission.id}>
                          {busyId === submission.id ? "Saving…" : "Save grade"}
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busyId === submission.id}
                          onClick={(event) => void review(submission, "CHANGES_REQUESTED", event.currentTarget.form!)}
                        >
                          Request changes
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busyId === submission.id}
                          onClick={(event) => void review(submission, "COMPLETED", event.currentTarget.form!)}
                        >
                          Mark complete
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {openId === row.enrollmentId && !submission ? (
                    <p className="mt-3 text-sm text-slate-500">This trainee has not submitted yet.</p>
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
