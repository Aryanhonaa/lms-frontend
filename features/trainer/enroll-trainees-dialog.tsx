"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { enrollTrainees, listEligibleTrainees, type EligibleTrainee } from "@/lib/api/enrollments";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

export function EnrollTraineesDialog({
  open,
  programId,
  programTitle,
  batchId,
  batchName,
  onClose,
  onEnrolled,
}: {
  open: boolean;
  programId: string;
  programTitle: string;
  batchId: string;
  batchName: string;
  onClose: () => void;
  onEnrolled?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [trainees, setTrainees] = useState<EligibleTrainee[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    listEligibleTrainees(programId, debounced, batchId)
      .then((payload) => {
        if (!cancelled) {
          setTrainees(payload.trainees);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTrainees([]);
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainees.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, debounced, open, programId]);

  function close() {
    setQuery("");
    setDebounced("");
    setSelected(new Set());
    setTrainees(null);
    setError(null);
    setResult(null);
    onClose();
  }

  const selectedCount = selected.size;
  const available = useMemo(() => trainees ?? [], [trainees]);

  function toggle(id: string, enrolled: boolean) {
    if (enrolled) {
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function enroll() {
    if (selectedCount === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload = await enrollTrainees(programId, [...selected], batchId);
      const parts = [`${payload.enrolledCount} enrolled successfully`];
      if (payload.alreadyEnrolledCount > 0) {
        parts.push(`${payload.alreadyEnrolledCount} were already enrolled`);
      }
      if (payload.skippedCount > 0) {
        parts.push(`${payload.skippedCount} could not be enrolled`);
      }
      setResult(parts.join(". ") + ".");
      setSelected(new Set());
      const refreshed = await listEligibleTrainees(programId, debounced, batchId);
      setTrainees(refreshed.trainees);
      onEnrolled?.();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to enroll selected trainees.");
    } finally {
      setBusy(false);
    }
  }

  return (
      <Dialog
        open={open}
        title={batchName ? `Enroll into ${batchName}` : "Enroll Trainees"}
        onClose={close}
        side
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Selected: {selectedCount}</p>
            <div className="flex gap-2">
              <button type="button" className={secondaryButtonClass} onClick={close}>
                Cancel
              </button>
              <button type="button" className={primaryButtonClass} disabled={busy || selectedCount === 0} onClick={() => void enroll()}>
                {busy ? "Enrolling…" : "Enroll Selected"}
              </button>
            </div>
          </div>
        }
      >
      <p className="mb-4 text-sm text-slate-600">
        {programTitle}
        {batchName ? ` · ${batchName}` : ""}
      </p>
      <label className="mb-4 block text-sm">
        <span className="sr-only">Search trainees</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className={fieldClass}
        />
      </label>

      {error ? (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {result ? <p className="mb-3 text-sm text-emerald-700">{result}</p> : null}

      {trainees === null && !error ? <p className="text-sm text-slate-500">Loading trainees...</p> : null}
      {trainees && available.length === 0 ? (
        <p className="text-sm text-slate-500">
          {debounced ? "No trainees found." : "No eligible trainees available for enrollment."}
        </p>
      ) : null}

      <ul className="space-y-1">
        {available.map((trainee) => {
          const checked = selected.has(trainee.id);
          return (
            <li key={trainee.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 ${
                  trainee.enrolled ? "cursor-default opacity-70" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={trainee.enrolled}
                  onChange={() => toggle(trainee.id, trainee.enrolled)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{trainee.name}</span>
                  <span className="block text-xs text-slate-500">{trainee.email}</span>
                </span>
                {trainee.enrolled ? <span className="text-xs font-medium text-emerald-700">Already enrolled</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
