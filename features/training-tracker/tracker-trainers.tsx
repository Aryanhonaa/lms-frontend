"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { TrackerSubnav, formatDay, statusLabel } from "@/features/training-tracker/tracker-ui";
import { listTrackerTrainees, processLabel } from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass } from "@/lib/ui/form-classes";
import type { TrackerTrainee } from "@/types/training-tracker";

export function TrackerTrainersView() {
  const [rows, setRows] = useState<TrackerTrainee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trainer, setTrainer] = useState("");
  const [process, setProcess] = useState("");
  const [team, setTeam] = useState("");

  useEffect(() => {
    listTrackerTrainees()
      .then((payload) => {
        setRows(payload.trainees);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load records"));
  }, []);

  const trainers = useMemo(
    () => [...new Set((rows ?? []).map((row) => row.trainer?.name).filter(Boolean))] as string[],
    [rows],
  );
  const visible = (rows ?? []).filter((row) => {
    if (trainer && row.trainer?.name !== trainer) {
      return false;
    }
    if (process && row.process !== process) {
      return false;
    }
    if (team && !row.team.toLowerCase().includes(team.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      <div className="grid gap-2 sm:grid-cols-3">
        <select className={fieldClass} value={trainer} onChange={(event) => setTrainer(event.target.value)}>
          <option value="">All trainers</option>
          {trainers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={process} onChange={(event) => setProcess(event.target.value)}>
          <option value="">All processes</option>
          <option value="VOICE_SALES">Voice / Sales</option>
          <option value="NON_VOICE_SALES_SUPPORT">Non-Voice / Sales Support</option>
        </select>
        <input className={fieldClass} value={team} placeholder="Filter team" onChange={(event) => setTeam(event.target.value)} />
      </div>
      {error ? <ErrorState message={error} /> : null}
      {!rows && !error ? <LoadingState /> : null}
      {rows && visible.length === 0 ? <EmptyState title="No trainer records" description="Assign trainees to a trainer from a batch." /> : null}
      {visible.length > 0 ? (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                {["Candidate", "Batch", "Trainer", "Team", "Process", "Joined", "Training", "Certification", "Handover"].map((label) => (
                  <th key={label} className="px-3 py-2 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium">{row.user.name}</td>
                  <td className="px-3 py-2">{row.batch?.code ?? "—"}</td>
                  <td className="px-3 py-2">{row.trainer?.name ?? "—"}</td>
                  <td className="px-3 py-2">{row.team || "—"}</td>
                  <td className="px-3 py-2">{processLabel(row.process)}</td>
                  <td className="px-3 py-2">{formatDay(row.joiningDate)}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2">{row.examPassed ? "Certified" : "—"}</td>
                  <td className="px-3 py-2">{row.handoverDate ? "Handed over" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
