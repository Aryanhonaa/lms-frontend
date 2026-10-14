"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import {
  handOver,
  listTeams,
  recordExit,
  removeEnrollment,
  setJoinedDate,
  type TrackerRole,
} from "@/lib/api/batch-tracker";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { Team, TrackerTrainee } from "@/types/batch-tracker";

const labelClass = "block text-xs font-medium tracking-wide text-slate-500 uppercase";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function Footer({
  busy,
  label,
  onCancel,
  form,
  danger,
}: {
  busy: boolean;
  label: string;
  onCancel: () => void;
  form: string;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className={secondaryButtonClass} onClick={onCancel}>
        Cancel
      </button>
      <button
        type="submit"
        form={form}
        disabled={busy}
        className={
          danger
            ? "inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition duration-150 hover:bg-rose-700 disabled:opacity-50"
            : primaryButtonClass
        }
      >
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}

export function ExitDialog({
  role,
  trainee,
  type,
  today,
  onClose,
  onDone,
}: {
  role: TrackerRole;
  trainee: TrackerTrainee | null;
  type: "LEFT" | "TERMINATED";
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminate = type === "TERMINATED";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trainee) {
      return;
    }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await recordExit(role, trainee.enrollmentId, {
        type,
        date: String(data.get("date") ?? "") || undefined,
        reason: String(data.get("reason") ?? "").trim() || undefined,
      });
      onDone();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(trainee)}
      title={terminate ? `Terminate ${trainee?.trainee.name ?? ""}` : `Mark ${trainee?.trainee.name ?? ""} as left`}
      onClose={onClose}
      footer={
        <Footer busy={busy} label={terminate ? "Terminate" : "Mark as left"} onCancel={onClose} form="exit-form" danger />
      }
    >
      <form id="exit-form" className="space-y-4" onSubmit={onSubmit}>
        <p className="text-sm text-slate-600">
          {terminate
            ? "Use this when a trainee is removed from training, for example after the day-15 evaluation."
            : "Use this when a trainee resigns or stops attending. Exits within 3 working days of joining count as HR attrition."}
        </p>
        <label className={labelClass}>
          {terminate ? "Termination date" : "Last day"}
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            min={trainee?.joinedAt ?? undefined}
            className={`${fieldClass} mt-1 font-normal normal-case`}
          />
        </label>
        <label className={labelClass}>
          Reason
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            placeholder={terminate ? "Not aligned with training objectives" : "Personal reasons"}
            className={`${fieldClass} mt-1 font-normal normal-case`}
          />
        </label>
        <p className="text-xs text-slate-500">The trainee loses access to this course. You can reinstate them later.</p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}

export function RemoveEnrollmentDialog({
  role,
  target,
  onClose,
  onDone,
}: {
  role: TrackerRole;
  target: { enrollmentId: string; name: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) {
      return;
    }
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      await removeEnrollment(role, target.enrollmentId, reason || undefined);
      onDone();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to remove this trainee."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      title={`Remove ${target?.name ?? ""}`}
      onClose={close}
      footer={<Footer busy={busy} label="Remove" onCancel={close} form="remove-enrollment-form" danger />}
    >
      <form id="remove-enrollment-form" className="space-y-4" onSubmit={onSubmit}>
        <p className="text-sm text-slate-600">
          Use this only if the trainee was enrolled by mistake. They are taken out of this batch as if they were never
          enrolled: no attrition is recorded and their seat is freed.
        </p>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Only possible before the trainee starts: no content completed, quizzes attempted, assignments submitted or
          attendance recorded. After that, use &ldquo;Mark as left&rdquo;.
        </p>
        <label className={labelClass}>
          Note
          <input
            name="reason"
            maxLength={500}
            placeholder="Enrolled by mistake"
            className={`${fieldClass} mt-1 font-normal normal-case`}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}

export function JoinedDateDialog({
  role,
  trainee,
  today,
  onClose,
  onDone,
}: {
  role: TrackerRole;
  trainee: TrackerTrainee | null;
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trainee) {
      return;
    }
    const date = String(new FormData(event.currentTarget).get("date") ?? "");
    if (!date) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setJoinedDate(role, trainee.enrollmentId, date);
      onDone();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(trainee)}
      title="Change joining date"
      onClose={onClose}
      footer={<Footer busy={busy} label="Save" onCancel={onClose} form="joined-form" />}
    >
      <form id="joined-form" className="space-y-4" onSubmit={onSubmit}>
        <p className="text-sm text-slate-600">
          The day {trainee?.trainee.name} actually joined. Trainees joining within the first 3 working days stay in
          this batch.
        </p>
        <label className={labelClass}>
          Joined on <RequiredMark />
          <input
            type="date"
            name="date"
            required
            defaultValue={trainee?.joinedAt ?? today}
            max={today}
            className={`${fieldClass} mt-1 font-normal normal-case`}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}

export function HandoverDialog({
  role,
  batchId,
  open,
  candidates,
  preselected,
  today,
  canManageTeams,
  onClose,
  onDone,
}: {
  role: TrackerRole;
  batchId: string;
  open: boolean;
  candidates: TrackerTrainee[];
  preselected: string[];
  today: string;
  canManageTeams: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [selected, setSelected] = useState<string[]>(preselected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    listTeams(role)
      .then((payload) => {
        if (!cancelled) {
          setTeams(payload.teams.filter((team) => team.isActive));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, role]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const teamId = String(data.get("teamId") ?? "");
    if (!teamId || selected.length === 0) {
      setError("Choose a team and at least one trainee.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await handOver(role, batchId, {
        enrollmentIds: selected,
        teamId,
        date: String(data.get("date") ?? "") || undefined,
      });
      onDone();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to hand over."));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <Dialog
      open={open}
      title="Hand over to the sales floor"
      onClose={onClose}
      footer={
        <Footer
          busy={busy}
          label={selected.length > 1 ? `Hand over ${selected.length}` : "Hand over"}
          onCancel={onClose}
          form="handover-form"
        />
      }
    >
      <form id="handover-form" className="space-y-4" onSubmit={onSubmit}>
        {teams !== null && teams.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No teams yet.{" "}
            {canManageTeams ? "Add teams under Settings → Sales teams first." : "Ask an admin to add sales teams first."}
          </p>
        ) : null}
        <label className={labelClass}>
          Team <RequiredMark />
          <select name="teamId" required className={`${fieldClass} mt-1 font-normal normal-case`} defaultValue="">
            <option value="" disabled>
              {teams === null ? "Loading teams…" : "Choose a team"}
            </option>
            {(teams ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {team.supervisorName ? ` · ${team.supervisorName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Handover date
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            className={`${fieldClass} mt-1 font-normal normal-case`}
          />
        </label>
        <fieldset>
          <legend className={labelClass}>Certified trainees</legend>
          {candidates.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Everyone certified in this batch has been handed over.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {candidates.map((row) => (
                <li key={row.enrollmentId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.enrollmentId)}
                      onChange={() => toggle(row.enrollmentId)}
                      className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                    />
                    <span className="flex-1 text-slate-900">{row.trainee.name}</span>
                    <span className="text-xs text-slate-400">{row.trainee.email}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}
