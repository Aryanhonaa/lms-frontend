"use client";

import { useEffect, useMemo, useState } from "react";
import { listBatchTrainees, listProgramBatches, type ProgramBatch } from "@/lib/api/batches";
import type { ProgramTraineeRow } from "@/lib/api/enrollments";
import { ApiClientError } from "@/lib/api/client";
import { RequiredMark } from "@/components/ui/required-mark";

export function TraineeSelectList({
  role,
  programId,
  batchId,
  selectedIds,
  onChange,
  fieldClass,
}: {
  role: "trainer" | "admin";
  programId: string;
  batchId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  fieldClass: string;
}) {
  const [query, setQuery] = useState("");
  const [trainees, setTrainees] = useState<ProgramTraineeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!batchId) {
      setTrainees([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listBatchTrainees(batchId, role)
      .then((payload) => {
        if (!cancelled) {
          setTrainees(payload.trainees.filter((row) => row.status !== "WITHDRAWN"));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainees");
          setTrainees([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, role, programId]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return trainees;
    }
    return trainees.filter((row) => `${row.trainee.name} ${row.trainee.email}`.toLowerCase().includes(needle));
  }, [trainees, query]);

  const allIds = trainees.map((row) => row.trainee.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Trainees
          <RequiredMark />
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-violet-700 hover:text-violet-800 disabled:opacity-40"
          disabled={allIds.length === 0}
          onClick={() => onChange(allSelected ? [] : allIds)}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <input
        className={fieldClass}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or email"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {loading ? <p className="text-xs text-slate-500">Loading trainees…</p> : null}
      {!loading && trainees.length === 0 ? (
        <p className="text-xs text-slate-500">This batch has no trainees yet.</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
          {visible.map((row) => {
            const checked = selectedIds.includes(row.trainee.id);
            return (
              <li key={row.enrollmentId} className="border-b border-slate-100 last:border-b-0">
                <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggle(row.trainee.id)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{row.trainee.name}</span>
                    <span className="block truncate text-xs text-slate-500">{row.trainee.email}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        {selectedIds.length} selected
        {trainees.length ? ` of ${trainees.length}` : ""}
      </p>
    </div>
  );
}

export function BatchSelect({
  role,
  programId,
  batchId,
  onChange,
  fieldClass,
}: {
  role: "trainer" | "admin";
  programId: string;
  batchId: string;
  onChange: (batchId: string) => void;
  fieldClass: string;
}) {
  const [batches, setBatches] = useState<ProgramBatch[]>([]);

  useEffect(() => {
    if (!programId) {
      setBatches([]);
      return;
    }
    let cancelled = false;
    listProgramBatches(programId, role)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setBatches(payload.batches);
        if (!batchId && payload.batches[0]) {
          onChange(payload.batches[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBatches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [programId, role]);

  return (
    <div>
      <label className="text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="announcement-batch">
        Batch
        <RequiredMark />
      </label>
      <select
        id="announcement-batch"
        className={`${fieldClass} mt-1`}
        value={batchId}
        onChange={(event) => onChange(event.target.value)}
      >
        {batches.length === 0 ? <option value="">No batches</option> : null}
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.name} · {batch.memberCount} enrolled
          </option>
        ))}
      </select>
    </div>
  );
}
