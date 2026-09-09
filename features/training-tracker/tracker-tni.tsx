"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { TrackerSubnav, formatDay, statusLabel } from "@/features/training-tracker/tracker-ui";
import { decideTrackerTni, getTrackerOptions, listTrackerTni, updateTrackerTniSupport } from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { PersonRef, TrackerTniCase } from "@/types/training-tracker";

export function TrackerTniView() {
  const { canOperate, canTerminate } = useTrackerCapabilities();
  const [cases, setCases] = useState<TrackerTniCase[] | null>(null);
  const [trainers, setTrainers] = useState<PersonRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [supportFor, setSupportFor] = useState<TrackerTniCase | null>(null);
  const [decisionFor, setDecisionFor] = useState<TrackerTniCase | null>(null);

  function reload() {
    return listTrackerTni()
      .then((payload) => {
        setCases(payload.cases);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load TNI"));
  }

  useEffect(() => {
    void reload();
    getTrackerOptions()
      .then((payload) => setTrainers(payload.trainers))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-4">
      <TrackerSubnav />
      {!canOperate && canTerminate ? (
        <p className="text-sm text-slate-500">
          Trainers run support plans and clear cases. Admins confirm termination when needed.
        </p>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {!cases && !error ? <LoadingState /> : null}
      {cases && cases.length === 0 ? (
        <EmptyState title="No extra support yet" description="This list fills when someone’s average weekly score drops below 75%." />
      ) : null}
      {cases && cases.length > 0 ? (
        <div className="grid gap-3">
          {cases.map((row) => (
            <article key={row.id} className={`${cardClass} px-5 py-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{row.trainee.user.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.trainee.batch?.code ?? "Existing employee"} · {statusLabel(row.status)} · avg {row.averageScore}%
                    {row.reAuditScore !== null ? ` · re-audit ${row.reAuditScore}%` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{row.identifiedGap}</p>
                  {row.supportPlan ? <p className="mt-1 text-sm text-slate-500">Plan: {row.supportPlan}</p> : null}
                  <p className="mt-1 text-xs text-slate-400">
                    Started {formatDay(row.startDate)}
                    {row.reviewDate ? ` · review ${formatDay(row.reviewDate)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canOperate ? (
                    <>
                      <button type="button" className={secondaryButtonClass} onClick={() => setSupportFor(row)}>
                        1–2 week plan
                      </button>
                      <button type="button" className={primaryButtonClass} onClick={() => setDecisionFor(row)}>
                        Decision
                      </button>
                    </>
                  ) : null}
                  {canTerminate && !canOperate ? (
                    <button type="button" className={primaryButtonClass} onClick={() => setDecisionFor(row)}>
                      Confirm termination
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {canOperate ? (
        <Dialog open={Boolean(supportFor)} title="Support plan (1–2 weeks)" onClose={() => setSupportFor(null)}>
          {supportFor ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void updateTrackerTniSupport(supportFor.id, {
                  identifiedGap: String(data.get("identifiedGap")),
                  trainerId: String(data.get("trainerId") || supportFor.trainer.id),
                  supportPlan: String(data.get("supportPlan")),
                  supportStartDate: String(data.get("supportStartDate")),
                  reviewDate: String(data.get("reviewDate")),
                  trainerRemarks: String(data.get("trainerRemarks") ?? ""),
                })
                  .then((payload) => {
                    setCases(payload.cases);
                    setSupportFor(null);
                  })
                  .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save support"));
              }}
            >
              <label className="text-sm font-medium text-slate-800">
                Skill gap identified
                <RequiredMark />
                <textarea name="identifiedGap" className={`${fieldClass} mt-1`} defaultValue={supportFor.identifiedGap} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Support trainer
                <RequiredMark />
                <select name="trainerId" className={`${fieldClass} mt-1`} defaultValue={supportFor.trainer.id} required>
                  {trainers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-800">
                Support plan
                <RequiredMark />
                <textarea name="supportPlan" className={`${fieldClass} mt-1`} defaultValue={supportFor.supportPlan} placeholder="What support will be given?" required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Support start date
                <RequiredMark />
                <input name="supportStartDate" type="date" className={`${fieldClass} mt-1`} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Review date
                <RequiredMark />
                <input name="reviewDate" type="date" className={`${fieldClass} mt-1`} required />
              </label>
              <label className="text-sm font-medium text-slate-800">
                Trainer remarks
                <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
                <textarea name="trainerRemarks" className={`${fieldClass} mt-1`} placeholder="Notes" />
              </label>
              <button type="submit" className={primaryButtonClass}>
                Save support
              </button>
            </form>
          ) : null}
        </Dialog>
      ) : null}
      <Dialog
        open={Boolean(decisionFor)}
        title={canOperate ? "What happens next" : "Confirm termination"}
        onClose={() => setDecisionFor(null)}
      >
        {decisionFor ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const decision = canOperate ? String(data.get("decision")) : "TERMINATED";
              void decideTrackerTni(decisionFor.id, {
                decision,
                confirmTermination: decision === "TERMINATED" ? data.get("confirmTermination") === "on" : undefined,
                reason: String(data.get("reason") ?? ""),
              })
                .then((payload) => {
                  setCases(payload.cases);
                  setDecisionFor(null);
                })
                .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to save decision"));
            }}
          >
            {canOperate ? (
              <label className="text-sm font-medium text-slate-800">
                Decision
                <RequiredMark />
                <select name="decision" className={`${fieldClass} mt-1`} required>
                  <option value="CLEARED">Cleared — can work independently</option>
                  <option value="CONTINUE_MONITORING">Keep watching</option>
                  <option value="INTERNAL_TRANSFER">Move team / swap</option>
                </select>
              </label>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Ending employment for <span className="font-medium text-slate-900">{decisionFor.trainee.user.name}</span>.
                </p>
                <input type="hidden" name="decision" value="TERMINATED" />
                <label className="flex items-center gap-2 text-sm text-red-700">
                  <input name="confirmTermination" type="checkbox" required />
                  I confirm termination
                </label>
              </>
            )}
            {canOperate ? (
              <p className="text-xs text-slate-500">Termination can only be confirmed by an admin.</p>
            ) : null}
            <label className="text-sm font-medium text-slate-800">
              Reason / notes
              <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
              <textarea name="reason" className={`${fieldClass} mt-1`} placeholder="Reason / notes" />
            </label>
            <button type="submit" className={primaryButtonClass}>
              {canOperate ? "Save decision" : "Terminate"}
            </button>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
