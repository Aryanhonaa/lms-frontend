"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CourseOutcomeBadge } from "@/components/course-outcome";
import { TrainerShell } from "@/components/trainer-shell";
import { Dialog } from "@/components/ui/dialog";
import { RequiredMark } from "@/components/ui/required-mark";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { EnrollTraineesDialog } from "@/features/trainer/enroll-trainees-dialog";
import { getTrainerProgram } from "@/lib/api/programs";
import { listProgramTrainees, type ProgramTraineeRow, type TraineeRosterCounts } from "@/lib/api/enrollments";
import {
  createProgramBatch,
  deleteProgramBatch,
  listProgramBatches,
  type ProgramBatch,
  type ProgramBatchesResponse,
} from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { programAllowsEnrollment } from "@/lib/programs/enrollment";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramTree } from "@/types/program";

export default function ProgramTraineesPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramTree | null>(null);
  const [trainees, setTrainees] = useState<ProgramTraineeRow[] | null>(null);
  const [counts, setCounts] = useState<TraineeRosterCounts | null>(null);
  const [batchState, setBatchState] = useState<ProgramBatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollBatch, setEnrollBatch] = useState<ProgramBatch | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) {
      return;
    }
    const [programPayload, traineePayload, batchesPayload] = await Promise.all([
      getTrainerProgram(params.id),
      listProgramTrainees(params.id),
      listProgramBatches(params.id),
    ]);
    setProgram(programPayload.program);
    setTrainees(traineePayload.trainees);
    setCounts(traineePayload.counts);
    setBatchState(batchesPayload);
    setError(null);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) {
      return;
    }
    let cancelled = false;
    Promise.all([getTrainerProgram(params.id), listProgramTrainees(params.id), listProgramBatches(params.id)])
      .then(([programPayload, traineePayload, batchesPayload]) => {
        if (cancelled) {
          return;
        }
        setProgram(programPayload.program);
        setTrainees(traineePayload.trainees);
        setCounts(traineePayload.counts);
        setBatchState(batchesPayload);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load batches.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function onCreateBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!params.id) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      return;
    }
    const capacityRaw = Number(data.get("capacity"));
    setBusyId("create");
    setError(null);
    try {
      await createProgramBatch(params.id, {
        name,
        description: String(data.get("description") ?? "").trim() || undefined,
        capacity: Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 25,
        startDate: String(data.get("startDate") ?? "") || undefined,
        endDate: String(data.get("endDate") ?? "") || undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create batch.");
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteBatch(batch: ProgramBatch) {
    if (batch.memberCount > 0) {
      setError("Cannot delete a batch that has enrollments.");
      return;
    }
    setBusyId(batch.id);
    setError(null);
    try {
      await deleteProgramBatch(batch.id);
      if (openBatchId === batch.id) {
        setOpenBatchId(null);
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to delete batch.");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return null;
  }

  const canEnroll = program ? programAllowsEnrollment(program.status) : false;
  const batches = batchState?.batches ?? [];
  const membersOf = (batchId: string) => (trainees ?? []).filter((row) => row.batch?.id === batchId);

  return (
    <TrainerShell
      title={program ? `${program.title} — Batches` : "Batches"}
      user={user}
      crumbLabel={program?.title}
      actions={
        canEnroll ? (
          <button type="button" className={primaryButtonClass} onClick={() => setCreateOpen(true)}>
            Create batch
          </button>
        ) : null
      }
    >
      {error ? <ErrorState message={error} /> : null}
      {trainees === null && !error ? <LoadingState label="Loading batches..." /> : null}
      {program ? (
        <p className="mb-4 text-sm text-slate-600">
          Reusable course · {program.status}. Each batch is its own run with its own seats.
        </p>
      ) : null}

      {counts ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          <OutcomeStat label="Total trainees" value={counts.total} />
          <OutcomeStat label="In Progress" value={counts.inProgress} />
          <OutcomeStat label="Completed" value={counts.completed} />
          <OutcomeStat label="Failed" value={counts.failed} />
        </section>
      ) : null}

      {canEnroll && batchState && batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a named run such as September 2026, then enroll trainees into that batch. You do not need to recreate the course."
        />
      ) : null}

      {batches.length > 0 ? (
        <section className="mb-6 grid gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Batches</h2>
          {batches.map((batch) => {
            const members = membersOf(batch.id);
            const open = openBatchId === batch.id;
            return (
              <article key={batch.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button type="button" className="text-left" onClick={() => setOpenBatchId(open ? null : batch.id)}>
                    <p className="font-medium text-slate-900">
                      {program?.title ? `${program.title} — ${batch.name}` : batch.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {batch.memberCount} / {batch.capacity} enrolled · {batch.remaining} remaining
                      {batch.description ? ` · ${batch.description}` : ""}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {canEnroll ? (
                      <button
                        type="button"
                        className={primaryButtonClass}
                        onClick={() => {
                          setEnrollBatch(batch);
                          setEnrollOpen(true);
                        }}
                      >
                        Enroll trainees
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={busyId === batch.id || batch.memberCount > 0}
                      onClick={() => void onDeleteBatch(batch)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {open ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {members.length === 0 ? (
                      <p className="text-sm text-slate-500">No trainees in this batch yet.</p>
                    ) : (
                      <TraineeList rows={members} programId={program?.id ?? params.id} />
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {program && enrollBatch ? (
        <EnrollTraineesDialog
          open={enrollOpen}
          programId={program.id}
          programTitle={program.title}
          batchId={enrollBatch.id}
          batchName={enrollBatch.name}
          onClose={() => {
            setEnrollOpen(false);
            setEnrollBatch(null);
          }}
          onEnrolled={() => void load()}
        />
      ) : null}

      <Dialog open={createOpen} title="Create batch" onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3" onSubmit={(event) => void onCreateBatch(event)}>
          <p className="text-sm text-slate-600">{program?.title ?? "Course"}</p>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              Batch name
              <RequiredMark />
            </span>
            <input name="name" required className={fieldClass} placeholder="September 2026" disabled={busyId === "create"} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Capacity</span>
            <input name="capacity" type="number" min={1} max={200} defaultValue={25} className={fieldClass} disabled={busyId === "create"} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Start date</span>
              <input name="startDate" type="date" className={fieldClass} disabled={busyId === "create"} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">End date</span>
              <input name="endDate" type="date" className={fieldClass} disabled={busyId === "create"} />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Description</span>
            <textarea name="description" rows={3} className={fieldClass} disabled={busyId === "create"} />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={primaryButtonClass} disabled={busyId === "create"}>
              {busyId === "create" ? "Saving…" : "Create batch"}
            </button>
          </div>
        </form>
      </Dialog>
    </TrainerShell>
  );
}

function OutcomeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-950/5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TraineeList({ rows, programId }: { rows: ProgramTraineeRow[]; programId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-2 font-medium">Trainee</th>
            <th className="pb-2 font-medium">Progress</th>
            <th className="pb-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.enrollmentId}>
              <td className="py-3">
                <Link
                  href={`/trainer/programs/${programId}/trainees/${row.enrollmentId}`}
                  className="font-medium text-slate-900 hover:text-violet-700"
                >
                  {row.trainee.name}
                </Link>
                <p className="text-xs text-slate-500">{row.trainee.email}</p>
              </td>
              <td className="py-3 text-slate-700">{Math.round(row.progress)}%</td>
              <td className="py-3">
                <CourseOutcomeBadge
                  course={{
                    outcome: row.courseOutcome,
                    courseStatus: row.courseStatus,
                    failedAssessments: row.failedAssessments ?? [],
                  }}
                  progress={row.progress}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
