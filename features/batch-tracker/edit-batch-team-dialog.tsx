"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { getBatchCatalog, updateProgramBatch } from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

type TrainerOption = { id: string; name: string; email?: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EditBatchTeamDialog({
  open,
  batchId,
  lead,
  collaborators,
  onClose,
  onSaved,
}: {
  open: boolean;
  batchId: string;
  lead: TrainerOption | null;
  collaborators: TrainerOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCollaboratorIds(collaborators.map((row) => row.id));
    setQuery("");
    setError(null);
  }, [open, collaborators]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    getBatchCatalog()
      .then((payload) => {
        if (!cancelled) {
          setTrainers(payload.trainers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrainers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const leadId = lead?.id ?? null;
  const options = useMemo(
    () => trainers.filter((row) => row.id !== leadId),
    [trainers, leadId],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((row) => `${row.name} ${row.email ?? ""}`.toLowerCase().includes(needle));
  }, [options, query]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateProgramBatch(batchId, {
        collaboratorIds: collaboratorIds.filter((id) => id !== leadId),
        ...(leadId ? { salesTrainerId: leadId } : {}),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update co-trainers.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Edit team" onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm text-slate-600">
          You are the lead for this batch. Add or remove co-trainers so they can enroll trainees, edit courses, and
          grade work with you.
        </p>

        {lead ? (
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
              {initials(lead.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Lead trainer</p>
              <p className="truncate text-sm font-medium text-slate-900">{lead.name}</p>
              {lead.email ? <p className="truncate text-xs text-slate-500">{lead.email}</p> : null}
            </div>
          </div>
        ) : null}

        <label className="relative block">
          <span className="sr-only">Search trainers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search co-trainers by name or email"
            className={`${fieldClass} pl-9`}
          />
        </label>

        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Co-trainers</p>
            <p className="text-xs text-slate-400">{collaboratorIds.length} selected</p>
          </div>
          {collaboratorIds.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {collaboratorIds.map((id) => {
                const trainer = trainers.find((row) => row.id === id) ?? collaborators.find((row) => row.id === id);
                if (!trainer) {
                  return null;
                }
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setCollaboratorIds((current) => current.filter((item) => item !== id))}
                      className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-900 transition hover:bg-violet-200"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
                        {initials(trainer.name)}
                      </span>
                      {trainer.name}
                      <X className="h-3 w-3 opacity-70" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {filtered.length === 0 ? (
              <li className="px-4 py-5 text-center text-sm text-slate-500">No other trainers to add.</li>
            ) : (
              filtered.map((trainer) => {
                const selected = collaboratorIds.includes(trainer.id);
                return (
                  <li key={trainer.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() =>
                        setCollaboratorIds((current) =>
                          current.includes(trainer.id)
                            ? current.filter((item) => item !== trainer.id)
                            : [...current, trainer.id],
                        )
                      }
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                        selected ? "bg-violet-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {initials(trainer.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{trainer.name}</span>
                        {trainer.email ? (
                          <span className="block truncate text-xs text-slate-500">{trainer.email}</span>
                        ) : null}
                      </span>
                      {selected ? (
                        <span className="text-xs font-medium text-violet-700">Added</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Users className="h-3.5 w-3.5" />
            This batch
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {[
              lead?.name ? `${lead.name} (lead)` : null,
              ...collaboratorIds.map((id) => trainers.find((row) => row.id === id)?.name).filter(Boolean),
            ]
              .filter(Boolean)
              .join(" · ") || "No trainers selected"}
          </p>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save team"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
