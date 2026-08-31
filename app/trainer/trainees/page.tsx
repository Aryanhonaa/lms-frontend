"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CourseOutcomeBadge } from "@/components/course-outcome";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTrainerTrainees, type TrainerProgramOption, type TrainerTraineeRow, type TraineeRosterCounts } from "@/lib/api/enrollments";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTraineesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const programFilter = searchParams.get("programId") ?? "";

  const [programs, setPrograms] = useState<TrainerProgramOption[]>([]);
  const [trainees, setTrainees] = useState<TrainerTraineeRow[] | null>(null);
  const [counts, setCounts] = useState<TraineeRosterCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTrainees(null);
    listTrainerTrainees(programFilter || undefined)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setPrograms(payload.programs);
        setTrainees(payload.trainees);
        setCounts(payload.counts);
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
  }, [programFilter]);

  const visiblePrograms = useMemo(() => programs, [programs]);

  function onProgramChange(nextProgramId: string) {
    const next = new URLSearchParams();
    if (nextProgramId) {
      next.set("programId", nextProgramId);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Trainees" user={user}>
      <p className="mb-4 text-sm text-slate-500">Trainees enrolled in your programs.</p>

      <div className="mb-6 max-w-sm">
        <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="trainer-trainee-program">
          Program
          <select
            id="trainer-trainee-program"
            className={`${fieldClass} mt-1 font-normal normal-case`}
            value={programFilter}
            disabled={visiblePrograms.length === 0}
            onChange={(event) => onProgramChange(event.target.value)}
          >
            <option value="">All programs</option>
            {visiblePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {counts ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          <OutcomeStat label="Total enrollments" value={counts.total} />
          <OutcomeStat label="In progress" value={counts.inProgress} />
          <OutcomeStat label="Completed" value={counts.completed} />
          <OutcomeStat label="Failed" value={counts.failed} />
        </section>
      ) : null}

      {trainees === null && !error ? <LoadingState label="Loading trainees..." /> : null}

      {trainees && trainees.length === 0 ? (
        <EmptyState
          title="No trainees found"
          description={
            programFilter
              ? "No trainees are enrolled in this program yet."
              : "Enroll trainees into a program batch to see them here."
          }
        />
      ) : null}

      {trainees && trainees.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-950/5">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Trainee</th>
                <th className="px-5 py-3 font-medium">Program</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trainees.map((row) => (
                <tr key={row.enrollmentId}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/trainer/programs/${row.program.id}/trainees/${row.enrollmentId}`}
                      className="font-medium text-slate-900 hover:text-violet-700"
                    >
                      {row.trainee.name}
                    </Link>
                    <p className="text-xs text-slate-500">{row.trainee.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/trainer/programs/${row.program.id}`} className="text-slate-700 hover:text-violet-700">
                      {row.program.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.batch?.name ?? "—"}</td>
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
        </div>
      ) : null}
    </TrainerShell>
  );
}

function OutcomeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-950/5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
