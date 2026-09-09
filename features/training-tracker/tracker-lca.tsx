"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { TrackerSubnav, formatDay } from "@/features/training-tracker/tracker-ui";
import { createTrackerAudit, listTrackerAudits, listTrackerTrainees } from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import type { TrackerAudit, TrackerTrainee } from "@/types/training-tracker";

export function TrackerLcaView() {
  const { canOperate } = useTrackerCapabilities();
  const [audits, setAudits] = useState<TrackerAudit[] | null>(null);
  const [trainees, setTrainees] = useState<TrackerTrainee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function reload() {
    return Promise.all([listTrackerAudits(), listTrackerTrainees()])
      .then(([auditPayload, traineePayload]) => {
        setAudits(auditPayload.audits);
        setTrainees(traineePayload.trainees);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load audits"));
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      {canOperate ? (
        <div className="flex justify-end">
          <button type="button" className={primaryButtonClass} onClick={() => setOpen(true)}>
            Record a score
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">View only — trainers record weekly call and chat scores.</p>
      )}
      {error ? <ErrorState message={error} /> : null}
      {!audits && !error ? <LoadingState /> : null}
      {audits && audits.length === 0 ? (
        <EmptyState
          title="No quality checks yet"
          description={
            canOperate
              ? "After training, record weekly call or chat scores. If the average is below 75%, extra support opens automatically."
              : "Scores appear here after trainers record weekly quality checks."
          }
        />
      ) : null}
      {audits && audits.length > 0 ? (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                {["Candidate", "Batch", "Week", "Date", "Type", "Score", "Re-audit", "Auditor", "Remarks"].map((label) => (
                  <th key={label} className="px-3 py-2 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium">{row.trainee.user.name}</td>
                  <td className="px-3 py-2">{row.trainee.batch?.code ?? "Existing"}</td>
                  <td className="px-3 py-2">{row.weekNumber}</td>
                  <td className="px-3 py-2">{formatDay(row.auditDate)}</td>
                  <td className="px-3 py-2">{row.auditType}</td>
                  <td className="px-3 py-2">{row.score}%</td>
                  <td className="px-3 py-2">{row.isReAudit ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{row.auditor.name}</td>
                  <td className="px-3 py-2">{row.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canOperate ? (
      <Dialog open={open} title="Weekly quality check" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void createTrackerAudit({
              traineeId: String(data.get("traineeId")),
              weekNumber: Number(data.get("weekNumber")),
              auditDate: String(data.get("auditDate")),
              auditType: String(data.get("auditType")),
              score: Number(data.get("score")),
              remarks: String(data.get("remarks") ?? ""),
              isReAudit: data.get("isReAudit") === "on",
            })
              .then(() => {
                setOpen(false);
                return reload();
              })
              .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save audit"));
          }}
        >
          <label className="text-sm font-medium text-slate-800">
            Candidate
            <RequiredMark />
            <select name="traineeId" className={`${fieldClass} mt-1`} required>
              <option value="">Select person</option>
              {trainees.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.user.name} {row.batch ? `· ${row.batch.code}` : "· existing"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Week number (1–8)
            <RequiredMark />
            <input name="weekNumber" type="number" min={1} max={8} defaultValue={1} className={`${fieldClass} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Audit date
            <RequiredMark />
            <input name="auditDate" type="date" className={`${fieldClass} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Audit type
            <RequiredMark />
            <select name="auditType" className={`${fieldClass} mt-1`} required>
              <option value="CALL">Call</option>
              <option value="CHAT">Chat</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Score (%)
            <RequiredMark />
            <input name="score" type="number" min={0} max={100} step="0.1" className={`${fieldClass} mt-1`} placeholder="0–100" required />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input name="isReAudit" type="checkbox" />
            Re-check after extra support
            <span className="text-xs font-normal text-slate-500">(optional)</span>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Remarks
            <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
            <textarea name="remarks" className={`${fieldClass} mt-1`} placeholder="Notes" />
          </label>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-red-600">*</span> Required fields
          </p>
          <button type="submit" className={primaryButtonClass}>
            Save audit
          </button>
        </form>
      </Dialog>
      ) : null}
    </div>
  );
}
