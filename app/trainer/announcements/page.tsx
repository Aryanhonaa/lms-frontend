"use client";

import { FormEvent, useEffect, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { AnnouncementList } from "@/features/engagement/announcement-list";
import { BatchSelect, TraineeSelectList } from "@/features/engagement/trainee-select-list";
import { createAnnouncement, listAnnouncements } from "@/lib/api/engagement";
import { listTrainerPrograms } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { AnnouncementAudience, AnnouncementItem } from "@/types/engagement";
import type { ProgramSummary } from "@/types/program";

export default function TrainerAnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AnnouncementItem[] | null>(null);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [programId, setProgramId] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("PROGRAM");
  const [batchId, setBatchId] = useState("");
  const [traineeIds, setTraineeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function reload() {
    Promise.all([listAnnouncements("trainer"), listTrainerPrograms()])
      .then(([payload, programPayload]) => {
        setItems(payload.announcements);
        setPrograms(programPayload.programs);
        setProgramId((current) => current || programPayload.programs[0]?.id || "");
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load announcements");
      });
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!programId) {
      return;
    }
    setSaving(true);
    try {
      await createAnnouncement("trainer", {
        title,
        body,
        audience,
        programId,
        batchId: audience === "TRAINEES_SELECTED" ? batchId : null,
        traineeIds: audience === "TRAINEES_SELECTED" ? traineeIds : undefined,
      });
      setTitle("");
      setBody("");
      setTraineeIds([]);
      const payload = await listAnnouncements("trainer");
      setItems(payload.announcements);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to publish");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Announcements" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="bg-white">
          <div className="border-b border-stone-200 px-5 py-3 text-sm font-medium">Visible to you</div>
          {items && items.length === 0 ? (
            <EmptyState title="None yet" description="Platform and program announcements will appear here." />
          ) : null}
          {items ? <AnnouncementList announcements={items} /> : null}
        </section>
        <section className="bg-white px-5 py-5">
          <h2 className="text-base font-medium text-stone-950">Program note</h2>
          <p className="mt-1 text-sm text-stone-600">Post to everyone in a program, or pick people in a batch.</p>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="audience">
                Audience
              </label>
              <select
                id="audience"
                className={`${fieldClass} mt-1`}
                value={audience}
                onChange={(event) => {
                  setAudience(event.target.value as AnnouncementAudience);
                  setTraineeIds([]);
                }}
              >
                <option value="PROGRAM">Whole program</option>
                <option value="TRAINEES_SELECTED">Selected batch trainees</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="program">
                Program
              </label>
              <select
                id="program"
                className={`${fieldClass} mt-1`}
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value);
                  setBatchId("");
                  setTraineeIds([]);
                }}
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </div>
            {audience === "TRAINEES_SELECTED" && programId ? (
              <>
                <BatchSelect
                  role="trainer"
                  programId={programId}
                  batchId={batchId}
                  fieldClass={`${fieldClass} mt-1`}
                  onChange={(id) => {
                    setBatchId(id);
                    setTraineeIds([]);
                  }}
                />
                {batchId ? (
                  <TraineeSelectList
                    role="trainer"
                    programId={programId}
                    batchId={batchId}
                    selectedIds={traineeIds}
                    onChange={setTraineeIds}
                    fieldClass={`${fieldClass} mt-1`}
                  />
                ) : null}
              </>
            ) : null}
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className={`${fieldClass} mt-1`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="body">
                Body
              </label>
              <textarea
                id="body"
                className={`${fieldClass} mt-1 min-h-[96px]`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={saving || !programId || (audience === "TRAINEES_SELECTED" && (!batchId || traineeIds.length === 0))}
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
          </form>
        </section>
      </div>
    </TrainerShell>
  );
}
