"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { deleteProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { secondaryButtonClass } from "@/lib/ui/form-classes";
import { batchTitle, formatDay } from "./format";
import type { TrackerBatch } from "@/types/batch-tracker";

const dangerConfirmClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-600/20 transition duration-150 hover:bg-rose-700 active:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  batch: TrackerBatch | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (batchId: string) => void;
};

export function DeleteBatchDialog({ batch, open, onClose, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError(null);
      setConfirmText("");
    }
  }, [open, batch?.id]);

  if (!batch) {
    return null;
  }

  const traineeCount = batch.funnel.actualHc;
  const hasTrainees = traineeCount > 0;
  const title = batchTitle(batch);
  const confirmToken = (batch.code ?? batch.name).trim();
  const confirmed = confirmText.trim().toLowerCase() === confirmToken.toLowerCase();
  const courseTitles = (batch.courses?.length ? batch.courses : [batch.program]).map((course) => course.title);

  async function remove() {
    if (!confirmed || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteProgramBatch(batch.id);
      onDeleted(batch.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to delete this batch.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Delete batch?"
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>
            Keep batch
          </button>
          <button
            type="button"
            className={dangerConfirmClass}
            disabled={busy || !confirmed}
            onClick={() => void remove()}
          >
            <Trash2 className="h-4 w-4" />
            {busy ? "Deleting…" : hasTrainees ? "Delete anyway" : "Delete permanently"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className={`flex gap-3 rounded-2xl px-4 py-3.5 ring-1 ${
            hasTrainees ? "bg-amber-50 ring-amber-200/80" : "bg-rose-50 ring-rose-200/80"
          }`}
        >
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              hasTrainees ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${hasTrainees ? "text-amber-950" : "text-rose-950"}`}>
              {hasTrainees ? "Trainees are still enrolled" : "This cannot be undone"}
            </p>
            <p className={`mt-1 text-sm leading-6 ${hasTrainees ? "text-amber-900/80" : "text-rose-900/80"}`}>
              {hasTrainees
                ? `Deleting ${title} will permanently remove ${traineeCount} trainee${traineeCount === 1 ? "" : "s"} from this batch, including their progress, quiz attempts, and certificates for these courses.`
                : "The batch roster, course links, and schedule for this family will be removed."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Batch</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{batch.name}</p>
          {batch.code ? (
            <p className="mt-0.5 font-mono text-xs font-medium tracking-wide text-violet-700">{batch.code}</p>
          ) : null}
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">Courses</dt>
              <dd className="mt-0.5 text-slate-700">{courseTitles.join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Schedule</dt>
              <dd className="mt-0.5 tabular-nums text-slate-700">
                {batch.startDate ? `Started ${formatDay(batch.startDate, true)}` : "No start date"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Trainees</dt>
              <dd className="mt-0.5 tabular-nums text-slate-700">{traineeCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Team</dt>
              <dd className="mt-0.5 truncate text-slate-700">
                {[
                  batch.salesTrainer ? `${batch.salesTrainer.name} (Lead)` : null,
                  ...(batch.collaborators?.map((row) => row.name) ??
                    (batch.supportTrainer ? [batch.supportTrainer.name] : [])),
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
          </dl>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-800">
            Type <span className="font-mono text-violet-700">{confirmToken}</span> to confirm
          </span>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            placeholder={confirmToken}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-rose-400"
          />
        </label>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </Dialog>
  );
}
