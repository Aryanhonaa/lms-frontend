"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { createCalendarActivity } from "@/lib/api/calendar";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { TrainerCalendarFilters } from "@/types/calendar";

type Audience = "TRAINEE" | "BATCH";

const labelClass = "block text-xs font-medium tracking-wide text-slate-500 uppercase";

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function AddActivityDialog({
  open,
  filters,
  onClose,
  onCreated,
}: {
  open: boolean;
  filters: TrainerCalendarFilters;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [batchId, setBatchId] = useState("");
  const [audience, setAudience] = useState<Audience>("BATCH");
  const [traineeUserId, setTraineeUserId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(localToday);
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBatch = useMemo(
    () => filters.batches.find((batch) => batch.id === batchId) ?? null,
    [batchId, filters.batches],
  );
  const courseTitleById = useMemo(() => {
    const titles = new Map<string, string>();
    for (const course of filters.courses) {
      titles.set(course.id, course.title);
    }
    return titles;
  }, [filters.courses]);
  const trainees = useMemo(
    () => filters.trainees.filter((trainee) => trainee.batchId === batchId),
    [batchId, filters.trainees],
  );

  function resetForm() {
    setBatchId("");
    setAudience("BATCH");
    setTraineeUserId("");
    setTitle("");
    setDescription("");
    setDate(localToday());
    setTime("09:00");
    setError(null);
  }

  function close() {
    resetForm();
    onClose();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBatch || !title.trim()) {
      setError("Batch and title are required.");
      return;
    }
    if (audience === "TRAINEE" && !traineeUserId) {
      setError("Choose a trainee.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCalendarActivity({
        programId: selectedBatch.programId,
        batchId: selectedBatch.id,
        audience,
        traineeUserId: audience === "TRAINEE" ? traineeUserId : null,
        title: title.trim(),
        description: description.trim(),
        date,
        time,
      });
      resetForm();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create activity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Add activity"
      onClose={close}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={close}>
            Cancel
          </button>
          <button type="submit" form="add-activity-form" className={primaryButtonClass} disabled={busy}>
            {busy ? "Saving…" : "Add activity"}
          </button>
        </div>
      }
    >
      <form id="add-activity-form" className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <p className="text-sm text-slate-600">
          Schedule something for one trainee or the whole batch. It shows up on their calendars automatically.
        </p>

        <label className={labelClass}>
          Batch <RequiredMark />
          <select
            className={`${fieldClass} mt-1 font-normal normal-case`}
            value={batchId}
            onChange={(event) => {
              setBatchId(event.target.value);
              setTraineeUserId("");
            }}
            required
          >
            <option value="" disabled>
              Choose a batch
            </option>
            {filters.batches.map((batch) => {
              const courseTitle = courseTitleById.get(batch.programId);
              return (
                <option key={batch.id} value={batch.id}>
                  {courseTitle ? `${batch.name} · ${courseTitle}` : batch.name}
                </option>
              );
            })}
          </select>
        </label>

        <fieldset>
          <legend className={labelClass}>Assign to</legend>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { value: "BATCH" as const, label: "All trainees", hint: "Everyone in this batch" },
                { value: "TRAINEE" as const, label: "Specific trainee", hint: "One person only" },
              ] as const
            ).map((option) => {
              const active = audience === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setAudience(option.value);
                    if (option.value === "BATCH") {
                      setTraineeUserId("");
                    }
                  }}
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
        </fieldset>

        {audience === "TRAINEE" ? (
          <label className={labelClass}>
            Trainee <RequiredMark />
            <select
              className={`${fieldClass} mt-1 font-normal normal-case`}
              value={traineeUserId}
              onChange={(event) => setTraineeUserId(event.target.value)}
              required
              disabled={!batchId}
            >
              <option value="" disabled>
                {batchId ? "Choose a trainee" : "Pick a batch first"}
              </option>
              {trainees.map((trainee) => (
                <option key={`${trainee.id}:${trainee.batchId}`} value={trainee.id}>
                  {trainee.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={labelClass}>
          Title <RequiredMark />
          <input
            className={`${fieldClass} mt-1 font-normal normal-case`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
            placeholder="Team huddle"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Date <RequiredMark />
            <input
              type="date"
              className={`${fieldClass} mt-1 font-normal normal-case`}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Time <RequiredMark />
            <input
              type="time"
              className={`${fieldClass} mt-1 font-normal normal-case`}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </label>
        </div>

        <label className={labelClass}>
          Description
          <textarea
            className={`${fieldClass} mt-1 font-normal normal-case`}
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details for the trainee"
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Dialog>
  );
}
