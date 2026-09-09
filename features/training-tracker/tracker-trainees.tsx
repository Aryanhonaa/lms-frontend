"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { TrackerSubnav, formatDay, statusLabel } from "@/features/training-tracker/tracker-ui";
import {
  addStandaloneTrackerTrainee,
  getTrackerOptions,
  listTrackerTrainees,
  processLabel,
} from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import type { PersonRef, TrackerTrainee } from "@/types/training-tracker";

export function TrackerTraineesView({ trainerView = false }: { trainerView?: boolean }) {
  const { canOperate } = useTrackerCapabilities();
  const [rows, setRows] = useState<TrackerTrainee[] | null>(null);
  const [people, setPeople] = useState<PersonRef[]>([]);
  const [trainers, setTrainers] = useState<PersonRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const reload = useCallback(() => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return listTrackerTrainees(query)
      .then((payload) => {
        setRows(payload.trainees);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load trainees"));
  }, [status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    getTrackerOptions()
      .then((payload) => {
        setPeople(payload.trainees);
        setTrainers(payload.trainers);
      })
      .catch(() => undefined);
  }, []);

  const visible = useMemo(() => rows ?? [], [rows]);

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select className={`${fieldClass} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["IN_TRAINING", "HR_ATTRITION", "TRAINING_ATTRITION", "EXAM_PENDING", "CERTIFIED", "HANDED_OVER", "TNI", "ACTIVE", "TERMINATED"].map(
            (item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ),
          )}
        </select>
        {canOperate ? (
          <button type="button" className={primaryButtonClass} onClick={() => setOpen(true)}>
            {trainerView ? "Add existing employee" : "Add existing employee"}
          </button>
        ) : null}
      </div>
      {error ? <ErrorState message={error} /> : null}
      {!rows && !error ? <LoadingState /> : null}
      {rows && visible.length === 0 ? (
        <EmptyState
          title="No trainees"
          description={
            canOperate
              ? "Add LMS users into an NHT batch or as existing employees for LCA/TNI."
              : "People appear here after trainers add them to batches."
          }
        />
      ) : null}
      {visible.length > 0 ? (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                {["Candidate", "Batch", "Process", "Trainer", "Team", "Joined", "Status", "Exam", "Handover"].map((label) => (
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
                  <td className="px-3 py-2">{row.batch?.code ?? "Existing employee"}</td>
                  <td className="px-3 py-2">{processLabel(row.process)}</td>
                  <td className="px-3 py-2">{row.trainer?.name ?? "—"}</td>
                  <td className="px-3 py-2">{row.team || "—"}</td>
                  <td className="px-3 py-2">{formatDay(row.joiningDate)}</td>
                  <td className="px-3 py-2">{statusLabel(row.status)}</td>
                  <td className="px-3 py-2">{row.examPassed ? "Certified" : row.examAppeared ? "Failed" : "—"}</td>
                  <td className="px-3 py-2">{row.handoverDate ? "Handed over" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canOperate ? (
      <Dialog open={open} title="Track existing employee" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void addStandaloneTrackerTrainee({
              userId: String(data.get("userId")),
              process: String(data.get("process")),
              joiningDate: String(data.get("joiningDate")),
              team: String(data.get("team") ?? ""),
              trainerId: String(data.get("trainerId") || "") || null,
            })
              .then(() => {
                setOpen(false);
                return reload();
              })
              .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to add"));
          }}
        >
          <p className="text-xs text-slate-500">Use this for sales / sales support staff who were not in a new-hire batch.</p>
          <label className="text-sm font-medium text-slate-800">
            LMS user
            <RequiredMark />
            <select name="userId" className={`${fieldClass} mt-1`} required>
              <option value="">Select LMS user</option>
              {people.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Process / role track
            <RequiredMark />
            <select name="process" className={`${fieldClass} mt-1`} required>
              <option value="VOICE_SALES">Voice / Sales</option>
              <option value="NON_VOICE_SALES_SUPPORT">Non-Voice / Sales Support</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Trainer
            <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
            <select name="trainerId" className={`${fieldClass} mt-1`}>
              <option value="">None</option>
              {trainers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Joining date
            <RequiredMark />
            <input name="joiningDate" type="date" className={`${fieldClass} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Current team
            <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
            <input name="team" placeholder="Current team" className={`${fieldClass} mt-1`} />
          </label>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-red-600">*</span> Required fields
          </p>
          <button type="submit" className={primaryButtonClass}>
            Save
          </button>
        </form>
      </Dialog>
      ) : null}
    </div>
  );
}
