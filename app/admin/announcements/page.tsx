"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/page-header";
import { AnnouncementList } from "@/features/engagement/announcement-list";
import { createAnnouncement, listAnnouncements } from "@/lib/api/engagement";
import { listAdminCatalog } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { BatchSelect, TraineeSelectList } from "@/features/engagement/trainee-select-list";
import { RequiredMark } from "@/components/ui/required-mark";
import type { AnnouncementAudience, AnnouncementItem } from "@/types/engagement";
import type { ProgramSummary } from "@/types/program";

const CARD =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";
const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:border-violet-400";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementItem[] | null>(null);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("EVERYONE");
  const [programId, setProgramId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [traineeIds, setTraineeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const needsProgram = audience === "PROGRAM" || audience === "TRAINEES_SELECTED";

  function reload() {
    Promise.all([listAnnouncements("admin"), listAdminCatalog()])
      .then(([payload, catalog]) => {
        setItems(payload.announcements);
        setPrograms(catalog.programs);
        setProgramId((current) => current || catalog.programs[0]?.id || "");
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
    setSaving(true);
    try {
      await createAnnouncement("admin", {
        title,
        body,
        audience,
        programId: needsProgram ? programId : null,
        batchId: audience === "TRAINEES_SELECTED" ? batchId : null,
        traineeIds: audience === "TRAINEES_SELECTED" ? traineeIds : undefined,
      });
      setTitle("");
      setBody("");
      setTraineeIds([]);
      const payload = await listAnnouncements("admin");
      setItems(payload.announcements);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to publish");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Announcements" subtitle="Broadcast updates to the people who should see them." />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={CARD}>
          {items && items.length === 0 ? (
            <EmptyState title="No announcements" description="Publish a note to trainers, trainees, a program, or selected people in a batch." />
          ) : null}
          {items ? <AnnouncementList announcements={items} /> : null}
        </section>
        <section className={`${CARD} px-5 py-5`}>
          <h2 className="text-base font-semibold text-slate-900">New announcement</h2>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="audience">
                Audience
                <RequiredMark />
              </label>
              <select
                id="audience"
                className={fieldClass}
                value={audience}
                onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
              >
                <option value="EVERYONE">Everyone</option>
                <option value="TRAINERS">Trainers</option>
                <option value="TRAINEES">Trainees</option>
                <option value="PROGRAM">One program</option>
                <option value="TRAINEES_SELECTED">Selected batch trainees</option>
              </select>
            </div>
            {needsProgram ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="program">
                  Program
                  <RequiredMark />
                </label>
                <select
                  id="program"
                  className={fieldClass}
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
            ) : null}
            {audience === "TRAINEES_SELECTED" && programId ? (
              <>
                <BatchSelect
                  role="admin"
                  programId={programId}
                  batchId={batchId}
                  fieldClass={fieldClass}
                  onChange={(id) => {
                    setBatchId(id);
                    setTraineeIds([]);
                  }}
                />
                {batchId ? (
                  <TraineeSelectList
                    role="admin"
                    programId={programId}
                    batchId={batchId}
                    selectedIds={traineeIds}
                    onChange={setTraineeIds}
                    fieldClass={fieldClass}
                  />
                ) : null}
              </>
            ) : null}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="title">
                Title
                <RequiredMark />
              </label>
              <input id="title" className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="body">
                Body
                <RequiredMark />
              </label>
              <textarea
                id="body"
                className={`${fieldClass} min-h-[120px]`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-violet-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
              disabled={
                saving ||
                (needsProgram && !programId) ||
                (audience === "TRAINEES_SELECTED" && (!batchId || traineeIds.length === 0))
              }
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
