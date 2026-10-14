"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { previewBatchCode } from "@/lib/api/batch-tracker";
import { createProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { BatchCodePreview, LineOfBusiness } from "@/types/batch-tracker";
import type { ProgramTrainerAssignment } from "@/types/program";
import { formatDay } from "./format";

type Kind = LineOfBusiness | "GENERAL";

const KINDS: Array<{ value: Kind; label: string; hint: string }> = [
  { value: "VOICE", label: "Voice", hint: "Sales" },
  { value: "NON_VOICE", label: "Non-voice", hint: "Non-sales" },
  { value: "GENERAL", label: "General", hint: "Not an NHT batch" },
];

function skippedText(preview: BatchCodePreview): string | null {
  if (!preview.skipped) {
    return null;
  }
  const parts: string[] = [];
  if (preview.skipped.weeklyOff > 0) {
    parts.push(`${preview.skipped.weeklyOff} weekly off ${preview.skipped.weeklyOff === 1 ? "day" : "days"}`);
  }
  for (const holiday of preview.skipped.holidays) {
    parts.push(holiday.name);
  }
  return parts.length > 0 ? `Skips ${parts.join(", ")}` : null;
}

export function CreateBatchDialog({
  open,
  programId,
  programTitle,
  trainers,
  currentUserId,
  onClose,
  onCreated,
}: {
  open: boolean;
  programId: string;
  programTitle: string;
  trainers: ProgramTrainerAssignment[];
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<Kind>("VOICE");
  const [startDate, setStartDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [preview, setPreview] = useState<BatchCodePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracked = kind !== "GENERAL";

  useEffect(() => {
    if (!open || !tracked) {
      return;
    }
    const number = Number(batchNumber);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      previewBatchCode("trainer", {
        startDate: startDate || undefined,
        batchNumber: Number.isInteger(number) && number > 0 ? number : undefined,
      })
        .then((payload) => {
          if (!cancelled) {
            setPreview(payload);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreview(null);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [batchNumber, open, startDate, tracked]);

  function close() {
    setError(null);
    onClose();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const capacityRaw = Number(data.get("capacity"));
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 25;
    const description = String(data.get("description") ?? "").trim() || undefined;
    if (!tracked && !name) {
      setError("Give the batch a name.");
      return;
    }
    if (tracked && !startDate) {
      setError("NHT batches need a start date so the 25 working days can be counted.");
      return;
    }
    const number = Number(batchNumber);
    setBusy(true);
    setError(null);
    try {
      await createProgramBatch(
        programId,
        tracked
          ? {
              name: name || undefined,
              description,
              capacity,
              startDate,
              endDate: preview?.targetCompletionDate ?? undefined,
              lineOfBusiness: kind,
              batchNumber: Number.isInteger(number) && number > 0 ? number : undefined,
              salesTrainerId: String(data.get("salesTrainerId") ?? "") || undefined,
              supportTrainerId: String(data.get("supportTrainerId") ?? "") || undefined,
            }
          : {
              name,
              description,
              capacity,
              startDate: startDate || undefined,
              endDate: String(data.get("endDate") ?? "") || undefined,
            },
      );
      setStartDate("");
      setBatchNumber("");
      setPreview(null);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create batch.");
    } finally {
      setBusy(false);
    }
  }

  const skipped = preview ? skippedText(preview) : null;

  return (
    <Dialog
      open={open}
      title="Create batch"
      onClose={close}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={close}>
            Cancel
          </button>
          <button type="submit" form="create-batch-form" className={primaryButtonClass} disabled={busy}>
            {busy ? "Saving…" : "Create batch"}
          </button>
        </div>
      }
    >
      <form id="create-batch-form" className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-slate-500">{programTitle}</p>

        <div role="radiogroup" aria-label="Batch type" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {KINDS.map((option) => {
            const active = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(option.value)}
                className={`rounded-lg px-3 py-2 text-left transition duration-150 ${
                  active ? "bg-white shadow-sm ring-1 ring-slate-950/5" : "hover:bg-white/60"
                }`}
              >
                <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              Start date
              {tracked ? <RequiredMark /> : null}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required={tracked}
              className={fieldClass}
              disabled={busy}
            />
          </label>
          {tracked ? (
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Batch number</span>
              <input
                type="number"
                min={1}
                max={999}
                value={batchNumber}
                onChange={(event) => setBatchNumber(event.target.value)}
                placeholder={preview ? String(preview.batchNumber) : "Auto"}
                className={fieldClass}
                disabled={busy}
              />
            </label>
          ) : (
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">End date</span>
              <input name="endDate" type="date" className={fieldClass} disabled={busy} />
            </label>
          )}
        </div>

        {tracked ? (
          <div className="rounded-xl bg-violet-50/70 px-4 py-3 ring-1 ring-violet-100">
            <p className="font-mono text-base font-semibold tracking-wide text-violet-900">
              {preview?.code ?? "NHT-…"}
            </p>
            <p className="mt-0.5 text-sm text-violet-800/80">
              {preview?.targetCompletionDate
                ? `25 working days · ends ${formatDay(preview.targetCompletionDate, true)}`
                : "Pick a start date to see the target completion date."}
            </p>
            {skipped ? <p className="mt-0.5 text-xs text-violet-800/60">{skipped}</p> : null}
          </div>
        ) : null}

        {tracked ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Sales trainer</span>
              <select name="salesTrainerId" defaultValue={currentUserId} className={fieldClass} disabled={busy}>
                <option value="">Not assigned</option>
                {trainers.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.user.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Sales support trainer</span>
              <select name="supportTrainerId" defaultValue="" className={fieldClass} disabled={busy}>
                <option value="">Not assigned</option>
                {trainers.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.user.name}
                  </option>
                ))}
              </select>
            </label>
            {trainers.length < 2 ? (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Only trainers on this program can be picked. Add a co-trainer to the program to assign a support
                trainer.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              Name
              {tracked ? null : <RequiredMark />}
            </span>
            <input
              name="name"
              required={!tracked}
              className={fieldClass}
              placeholder={tracked ? "Defaults to the batch code" : "September 2026"}
              disabled={busy}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Seats</span>
            <input name="capacity" type="number" min={1} max={200} defaultValue={25} className={fieldClass} disabled={busy} />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Notes</span>
          <textarea name="description" rows={2} className={fieldClass} disabled={busy} />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}
