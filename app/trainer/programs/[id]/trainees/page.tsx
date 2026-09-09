"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CourseOutcomeBadge } from "@/components/course-outcome";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { getTrainerProgram } from "@/lib/api/programs";
import { listProgramTrainees, type ProgramTraineeRow, type TraineeRosterCounts } from "@/lib/api/enrollments";
import { ApiClientError } from "@/lib/api/client";
import { primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramTree } from "@/types/program";

export default function ProgramTraineesPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramTree | null>(null);
  const [trainees, setTrainees] = useState<ProgramTraineeRow[] | null>(null);
  const [counts, setCounts] = useState<TraineeRosterCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }
    let cancelled = false;
    Promise.all([getTrainerProgram(params.id), listProgramTrainees(params.id)])
      .then(([programPayload, traineePayload]) => {
        if (cancelled) {
          return;
        }
        setProgram(programPayload.program);
        setTrainees(traineePayload.trainees);
        setCounts(traineePayload.counts);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainees.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell
      title={program ? `${program.title} — Course roster` : "Course roster"}
      user={user}
      crumbLabel={program?.title}
      actions={
        <Link href="/trainer/training-tracker/batches" className={primaryButtonClass}>
          Go to Batches
        </Link>
      }
    >
      {error ? <ErrorState message={error} /> : null}
      {trainees === null && !error ? <LoadingState label="Loading trainees..." /> : null}
      {program ? (
        <p className="mb-4 text-sm text-slate-600">
          This is a read-only list of people already on this course. To add new hires, create a batch under{" "}
          <Link href="/trainer/training-tracker/batches" className="font-medium text-violet-700 hover:underline">
            Batches
          </Link>
          , select this course, then add trainees — they are enrolled automatically.
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

      {trainees && trainees.length === 0 ? (
        <EmptyState
          title="No trainees in this course yet"
          description="Open Batches, create a batch, select this course, and add people there."
          actionHref="/trainer/training-tracker/batches"
          actionLabel="Open Batches"
        />
      ) : null}

      {trainees && trainees.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-950/5">
          <TraineeList rows={trainees} programId={program?.id ?? params.id} />
        </div>
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

function TraineeList({ rows, programId }: { rows: ProgramTraineeRow[]; programId: string }) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-5 py-3 font-medium">Trainee</th>
          <th className="px-5 py-3 font-medium">Progress</th>
          <th className="px-5 py-3 font-medium">Outcome</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={row.enrollmentId}>
            <td className="px-5 py-3">
              <Link
                href={`/trainer/programs/${programId}/trainees/${row.enrollmentId}`}
                className="font-medium text-slate-900 hover:text-violet-700"
              >
                {row.trainee.name}
              </Link>
              <p className="text-xs text-slate-500">{row.trainee.email}</p>
            </td>
            <td className="px-5 py-3 text-slate-700">{Math.round(row.progress)}%</td>
            <td className="px-5 py-3">
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
  );
}
