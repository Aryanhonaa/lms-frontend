"use client";

import { useEffect, useMemo, useState } from "react";
import { listAdminTrainers } from "@/lib/api/admin";
import { assignProgramTrainers } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import type { AdminDirectoryUser } from "@/types/admin";
import type { ProgramTree } from "@/types/program";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const SELECT =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition duration-150 hover:border-slate-300 focus-visible:border-violet-400";

export function ProgramTrainersPicker({
  program,
  onUpdated,
}: {
  program: ProgramTree;
  onUpdated: (program: ProgramTree) => void;
}) {
  const ownerId = program.createdByUserId;
  const assignedIds = useMemo(
    () => new Set((program.trainers ?? []).map((row) => row.userId)),
    [program.trainers],
  );
  const [trainers, setTrainers] = useState<AdminDirectoryUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...assignedIds]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedIds([...assignedIds]);
  }, [program.id, assignedIds]);

  useEffect(() => {
    let cancelled = false;
    listAdminTrainers()
      .then((payload) => {
        if (!cancelled) {
          setTrainers(payload.trainers.filter((row) => row.isActive));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainers.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = trainers.filter((row) =>
    `${row.name} ${row.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const dirty =
    selectedIds.length !== assignedIds.size || selectedIds.some((id) => !assignedIds.has(id));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = await assignProgramTrainers(program.id, [...new Set([ownerId, ...selectedIds])]);
      onUpdated(payload.program);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update trainers.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${CARD} px-5 py-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Course trainers</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Assigned trainers can open this course and enroll trainees after it is approved. The
            creator stays the owner.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          Save trainers
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <input
        className={`${SELECT} mt-4 w-full font-normal`}
        value={search}
        placeholder="Search trainers..."
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-100 px-2 py-1">
        {visible.map((row) => {
          const isOwner = row.id === ownerId;
          const checked = selectedIds.includes(row.id);
          return (
            <label key={row.id} className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checked}
                disabled={isOwner}
                onChange={() => {
                  setSelectedIds((current) =>
                    current.includes(row.id)
                      ? current.filter((id) => id !== row.id)
                      : [...current, row.id],
                  );
                }}
              />
              <span>
                {row.name}
                {isOwner ? <span className="ml-1 text-xs text-slate-400">(owner)</span> : null}
              </span>
            </label>
          );
        })}
        {visible.length === 0 ? <p className="px-1 py-2 text-sm text-slate-500">No trainers match.</p> : null}
      </div>
    </section>
  );
}
