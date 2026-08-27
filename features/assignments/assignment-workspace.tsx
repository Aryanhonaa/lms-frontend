"use client";

import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { FileActionsRow } from "@/components/files/file-viewer";
import { formatFileSize, getAttachmentAccess, getSubmissionFileAccess } from "@/lib/api/files";
import {
  deleteSubmissionFile,
  saveAssignmentSubmission,
  uploadSubmissionFile,
} from "@/lib/api/assignments";
import { ApiClientError } from "@/lib/api/client";
import { requestCourseReviewCheck } from "@/lib/course-review";
import { friendlyLockReason } from "@/lib/learning/ux";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { AssignmentCatalog } from "@/types/assignment";

function statusLabel(status: string): string {
  if (status === "NOT_STARTED") {
    return "Not started";
  }
  if (status === "IN_PROGRESS") {
    return "Draft";
  }
  if (status === "CHANGES_REQUESTED") {
    return "Changes requested";
  }
  return status.replaceAll("_", " ").toLowerCase();
}

function formatWhen(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AssignmentWorkspace({
  catalog,
  batchId,
  onChange,
}: {
  catalog: AssignmentCatalog;
  batchId?: string;
  onChange: (next: AssignmentCatalog) => void;
}) {
  const [body, setBody] = useState(catalog.submission.body);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelUploadRef = useRef<(() => void) | null>(null);
  const lastFilesRef = useRef<File[] | null>(null);

  const allowText = catalog.assignment.allowTextResponse !== false;
  const allowFiles = catalog.assignment.allowFileUpload !== false;
  const files = catalog.submission.files ?? [];
  const attempts = catalog.attempts ?? [];
  const locked = catalog.assignment.status === "LOCKED";
  const graded =
    catalog.submission.status === "GRADED" || catalog.submission.status === "COMPLETED";

  async function persist(submit: boolean) {
    setBusy(true);
    setError(null);
    try {
      const payload = await saveAssignmentSubmission(catalog.assignment.id, body, submit, batchId);
      onChange(payload.catalog ?? { ...catalog, submission: payload.submission, canSubmit: !submit });
      setConfirmOpen(false);
      if (submit) {
        requestCourseReviewCheck();
      }
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to submit the assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function ensureDraft(): Promise<AssignmentCatalog> {
    if (catalog.submission.id && catalog.submission.status === "IN_PROGRESS") {
      return catalog;
    }
    const payload = await saveAssignmentSubmission(catalog.assignment.id, body, false, batchId);
    const next = payload.catalog ?? { ...catalog, submission: payload.submission, canSubmit: true };
    onChange(next);
    return next;
  }

  async function onUpload(selected: File[]) {
    if (selected.length === 0) {
      return;
    }
    lastFilesRef.current = selected;
    setBusy(true);
    setUploadError(null);
    setError(null);
    try {
      let current = await ensureDraft();
      const submissionId = current.submission.id;
      if (!submissionId) {
        throw new Error("Unable to start a draft.");
      }
      for (const file of selected) {
        setUploadPercent(0);
        const handle = uploadSubmissionFile(submissionId, file, setUploadPercent);
        cancelUploadRef.current = handle.cancel;
        const uploaded = await handle.promise;
        current = {
          ...current,
          submission: {
            ...current.submission,
            files: [...(current.submission.files ?? []), uploaded.file],
          },
        };
        onChange(current);
      }
      lastFilesRef.current = null;
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === "UPLOAD_CANCELLED") {
        setUploadError(null);
      } else {
        setUploadError(err instanceof ApiClientError ? err.message : "We couldn't upload this file. Please try again.");
      }
    } finally {
      cancelUploadRef.current = null;
      setUploadPercent(null);
      setBusy(false);
    }
  }

  async function onRemoveFile(fileId: string) {
    if (!catalog.submission.id) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteSubmissionFile(catalog.submission.id, fileId);
      onChange({
        ...catalog,
        submission: {
          ...catalog.submission,
          files: files.filter((file) => file.id !== fileId),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to remove that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <ContentTypeChip type="ASSIGNMENT" />
        <p className="mt-2 text-sm text-slate-500">{catalog.assignment.location}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{catalog.assignment.title}</h2>
        {catalog.assignment.pastDue ? (
          <p className="mt-2 text-sm font-medium text-amber-700">Past due{catalog.submission.isLate ? " · submitted late" : ""}</p>
        ) : null}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {catalog.assignment.description || "No additional description."}
        </p>
        {catalog.assignment.instructions ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-950/5">
            <p className="font-medium text-slate-900">Instructions</p>
            <p className="mt-1 whitespace-pre-wrap">{catalog.assignment.instructions}</p>
          </div>
        ) : null}

        {!locked && catalog.assignment.attachments?.length ? (
          <div className="mt-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-950/5">
            <p className="text-sm font-medium text-slate-900">Attachments</p>
            <ul className="mt-3 space-y-2">
              {catalog.assignment.attachments.map((attachment) => (
                <li key={attachment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <FileActionsRow
                    loader={() => getAttachmentAccess("trainee", attachment.id, batchId)}
                    fileName={attachment.title || attachment.fileName}
                    fileSize={attachment.fileSize}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {locked ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-950/5">
            This assignment is locked for now. {friendlyLockReason(catalog.assignment.reason)}
          </p>
        ) : (
          <>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">Your submission</h3>
              {allowText ? (
                <label className="mt-3 block text-sm font-medium text-slate-800">
                  Text response
                  <textarea
                    className={`${fieldClass} mt-2 min-h-48 w-full`}
                    value={body}
                    disabled={busy || !catalog.canSubmit}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
              ) : null}
              {allowFiles ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-800">Files</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Allowed: {catalog.assignment.allowedFileTypes ?? "pdf, doc, zip, images"} · max{" "}
                    {catalog.assignment.maxFileSizeMb ?? 25} MB
                  </p>
                  {files.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No files selected</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {files.map((file) => (
                        <li key={file.id} className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-950/5">
                          {catalog.submission.id ? (
                            <FileActionsRow
                              loader={() => getSubmissionFileAccess("trainee", catalog.submission.id!, file.id)}
                              fileName={file.fileName}
                              fileSize={file.fileSize}
                            />
                          ) : (
                            <p className="text-sm text-slate-900">{file.fileName}</p>
                          )}
                          {catalog.canSubmit ? (
                            <button
                              type="button"
                              className="mt-2 text-xs text-slate-500 hover:text-red-700"
                              disabled={busy}
                              onClick={() => void onRemoveFile(file.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {catalog.canSubmit ? (
                    <div className="mt-3">
                      <FileDropZone
                        multiple
                        label="Drag & drop your file here"
                        hint={`Supported: ${catalog.assignment.allowedFileTypes ?? "PDF, DOCX, images"} · max ${
                          catalog.assignment.maxFileSizeMb ?? 25
                        } MB`}
                        disabled={busy && uploadPercent === null}
                        progress={uploadPercent}
                        error={uploadError}
                        onFiles={(selected) => void onUpload(selected)}
                        onCancel={() => cancelUploadRef.current?.()}
                        onRetry={() => (lastFilesRef.current ? void onUpload(lastFilesRef.current) : undefined)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {catalog.submission.submittedAt && !catalog.canSubmit ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4 text-sm ring-1 ring-emerald-100">
                <p className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  Assignment submitted
                </p>
                {files.map((file) => (
                  <p key={file.id} className="mt-2 text-emerald-900">
                    {file.fileName}
                    {file.fileSize ? <span className="text-emerald-700"> · {formatFileSize(file.fileSize)}</span> : null}
                  </p>
                ))}
                <p className="mt-2 text-emerald-800">Submitted {formatWhen(catalog.submission.submittedAt)}</p>
              </div>
            ) : null}
            {catalog.canSubmit ? (
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void persist(false)}>
                  {busy ? "Saving…" : "Save draft"}
                </button>
                <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => setConfirmOpen(true)}>
                  Submit assignment
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{catalog.submitBlockReason}</p>
            )}
          </>
        )}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        {graded && catalog.submission.score !== null ? (
          <div className="mt-6 rounded-2xl bg-violet-50 px-4 py-4 ring-1 ring-violet-100">
            <p className="text-sm font-medium text-violet-900">Score</p>
            <p className="mt-1 text-2xl font-semibold text-violet-950">
              {catalog.submission.score} / {catalog.assignment.maxScore}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full bg-violet-600"
                style={{ width: `${Math.min(100, (catalog.submission.score / catalog.assignment.maxScore) * 100)}%` }}
              />
            </div>
            {catalog.submission.trainerComment ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-violet-950">{catalog.submission.trainerComment}</p>
            ) : (
              <p className="mt-3 text-sm text-violet-800">No feedback yet.</p>
            )}
          </div>
        ) : null}

        {attempts.length > 1 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Previous attempts</h3>
            <ul className="mt-2 space-y-2">
              {attempts.map((attempt) => (
                <li key={attempt.id ?? attempt.revision} className="rounded-xl bg-white px-3 py-3 text-sm ring-1 ring-slate-950/5">
                  <p className="font-medium text-slate-900">
                    Attempt {attempt.revision} · {statusLabel(attempt.status)}
                    {attempt.isLate ? " · late" : ""}
                  </p>
                  {attempt.score !== null ? (
                    <p className="mt-1 text-slate-600">
                      {attempt.score} / {catalog.assignment.maxScore}
                    </p>
                  ) : null}
                  {attempt.trainerComment ? <p className="mt-1 text-slate-600">{attempt.trainerComment}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <aside className="h-fit rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
        <p>
          Status: <span className="font-medium text-slate-900">{statusLabel(catalog.submission.status)}</span>
        </p>
        <p className="mt-2">Maximum score: {catalog.assignment.maxScore}</p>
        {catalog.assignment.dueDate ? (
          <p className="mt-2">Due {new Date(catalog.assignment.dueDate).toLocaleDateString()}</p>
        ) : null}
        <p className="mt-2">
          Attempts: {catalog.assignment.attemptCount ?? 0}
          {catalog.assignment.maxAttempts ? ` / ${catalog.assignment.maxAttempts}` : ""}
        </p>
        {catalog.submission.status === "IN_PROGRESS" && catalog.submission.updatedAt ? (
          <p className="mt-2">Last saved {formatWhen(catalog.submission.updatedAt)}</p>
        ) : null}
        {catalog.submission.submittedAt ? <p className="mt-2">Submitted {formatWhen(catalog.submission.submittedAt)}</p> : null}
        {catalog.submission.gradedAt ? <p className="mt-2">Graded {formatWhen(catalog.submission.gradedAt)}</p> : null}
      </aside>

      <Dialog open={confirmOpen} title="Submit assignment?" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-slate-600">
          Once submitted, you may not be able to edit this work unless resubmission is enabled.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void persist(true)}>
            {busy ? "Submitting…" : "Submit assignment"}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
