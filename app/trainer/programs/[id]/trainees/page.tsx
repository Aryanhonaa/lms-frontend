"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CourseOutcomeBadge } from "@/components/course-outcome";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LobChip } from "@/features/batch-tracker/badges";
import { CreateBatchDialog } from "@/features/batch-tracker/create-batch-dialog";
import { formatDay } from "@/features/batch-tracker/format";
import { RemoveEnrollmentDialog } from "@/features/batch-tracker/trainee-actions";
import { EnrollTraineesDialog } from "@/features/trainer/enroll-trainees-dialog";
import { getTrainerProgram } from "@/lib/api/programs";
import { listProgramTrainees, type ProgramTraineeRow, type TraineeRosterCounts } from "@/lib/api/enrollments";
import {
  deleteProgramBatch,
  listProgramBatches,
  type ProgramBatch,
  type ProgramBatchesResponse,
} from "@/lib/api/batches";
import { ApiClientError } from "@/lib/api/client";
import { programAllowsEnrollment } from "@/lib/programs/enrollment";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
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
  const [removeTarget, setRemoveTarget] = useState<{ enrollmentId: string; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
      {notice ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p> : null}
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
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                      {batch.code ? (
                        <>
                          <span>{batch.name === batch.code ? batch.code : `${batch.code} · ${batch.name}`}</span>
                          <LobChip value={batch.lineOfBusiness} />
                        </>
                      ) : program?.title ? (
                        `${program.title} — ${batch.name}`
                      ) : (
                        batch.name
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {batch.memberCount} / {batch.capacity} enrolled · {batch.remaining} remaining
                      {batch.startDate ? ` · Starts ${formatDay(batch.startDate.slice(0, 10), true)}` : ""}
                      {batch.salesTrainer || batch.supportTrainer
                        ? ` · ${[batch.salesTrainer?.name, batch.supportTrainer?.name].filter(Boolean).join(" & ")}`
                        : ""}
                      {batch.description ? ` · ${batch.description}` : ""}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {batch.code ? (
                      <Link href={`/trainer/batch-tracker/${batch.id}`} className={secondaryButtonClass}>
                        Track
                      </Link>
                    ) : null}
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
                      <TraineeList
                        rows={members}
                        programId={program?.id ?? params.id}
                        onRemove={(row) => setRemoveTarget({ enrollmentId: row.enrollmentId, name: row.trainee.name })}
                      />
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

      <RemoveEnrollmentDialog
        role="trainer"
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onDone={() => {
          setNotice(`${removeTarget?.name ?? "Trainee"} was removed from the batch.`);
          setRemoveTarget(null);
          void load();
        }}
      />

      {program ? (
        <CreateBatchDialog
          open={createOpen}
          programId={program.id}
          programTitle={program.title}
          trainers={program.trainers ?? []}
          currentUserId={user.id}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      ) : null}
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

function TraineeList({
  rows,
  programId,
  onRemove,
}: {
  rows: ProgramTraineeRow[];
  programId: string;
  onRemove: (row: ProgramTraineeRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-2 font-medium">Trainee</th>
            <th className="pb-2 font-medium">Progress</th>
            <th className="pb-2 font-medium">Outcome</th>
            <th className="pb-2">
              <span className="sr-only">Actions</span>
            </th>
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
              <td className="py-3 text-right">
                {row.canRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(row)}
                    title="Enrolled by mistake? Remove before they start."
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 transition duration-150 hover:bg-rose-50 hover:text-rose-700"
                  >
                    Remove
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
