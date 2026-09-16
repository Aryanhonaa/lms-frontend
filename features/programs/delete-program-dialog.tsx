"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ApiClientError } from "@/lib/api/client";
import { deleteAdminProgram, deleteTrainerProgram } from "@/lib/api/programs";
import type { ProgramSummary } from "@/types/program";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

export const deleteCourseButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition duration-150 hover:bg-red-50 disabled:opacity-50";

function deletionError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Unable to delete this course. Please try again.";
}

export function DeleteProgramDialog({
  program,
  asAdmin,
  title = "Delete course?",
  message,
  confirmLabel = "Delete course",
  onClose,
  onDeleted,
}: {
  program: Pick<ProgramSummary, "id" | "title"> | null;
  asAdmin?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onClose: () => void;
  onDeleted: (programId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (!busy) {
      setError(null);
      onClose();
    }
  }

  function confirm() {
    if (!program) {
      return;
    }
    setBusy(true);
    setError(null);
    const request = asAdmin ? deleteAdminProgram(program.id) : deleteTrainerProgram(program.id);
    request
      .then(() => {
        onDeleted(program.id);
      })
      .catch((err: unknown) => {
        setError(deletionError(err));
      })
      .finally(() => {
        setBusy(false);
      });
  }

  return (
    <Dialog open={Boolean(program)} title={title} onClose={close}>
      <p className="text-sm text-slate-600">
        {message ?? (
          <>
            This permanently removes <span className="font-medium text-slate-900">{program?.title}</span> and its
            curriculum. This cannot be undone.
          </>
        )}
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={close}>
          Cancel
        </button>
        <button type="button" className={dangerButtonClass} disabled={busy} onClick={confirm}>
          {busy ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
