"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/page-header";
import {
  DeleteUserDialog,
  USER_DELETED_NOTICE_KEY,
  deleteUserButtonClass,
  type DeletableUser,
} from "@/features/admin/delete-user-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { getAdminTrainee, type AdminTraineeProgram } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { canDeleteRole } from "@/lib/auth/create-user-schema";
import type { AdminDirectoryUser } from "@/types/admin";
import type { MilestoneProgress } from "@/types/progress";

function milestoneLabel(milestone: MilestoneProgress): string {
  if (milestone.satisfied || milestone.status === "COMPLETED" || milestone.status === "PASSED") {
    return "Completed";
  }
  if (milestone.status === "LOCKED") {
    return "Locked";
  }
  const complete = milestone.requirements.filter((row) => row.complete).length;
  return `${complete} / ${milestone.requirements.length} requirements`;
}

function milestoneMark(milestone: MilestoneProgress): string {
  if (milestone.satisfied || milestone.status === "COMPLETED" || milestone.status === "PASSED") {
    return "✓";
  }
  if (milestone.status === "LOCKED") {
    return "🔒";
  }
  return "◉";
}

function ProgramCard({ row }: { row: AdminTraineeProgram }) {
  const percent = Math.round(row.progress.overall.percent);
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{row.progress.program.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {row.status}
            {row.enrolledBy ? ` · Enrolled by ${row.enrolledBy.name}` : ""}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700">{percent}%</p>
      </div>
      <div className="h-2 bg-slate-100">
        <div className="h-2 bg-violet-600" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Milestones</h3>
        {row.progress.milestones.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No milestone activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {row.progress.milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-start gap-3 text-sm">
                <span aria-hidden className="mt-0.5 text-slate-500">
                  {milestoneMark(milestone)}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{milestone.title}</p>
                  <p className="text-slate-500">{milestoneLabel(milestone)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function AdminTraineeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [trainee, setTrainee] = useState<AdminDirectoryUser | null>(null);
  const [programs, setPrograms] = useState<AdminTraineeProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeletableUser | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }
    let cancelled = false;
    getAdminTrainee(params.id)
      .then((payload) => {
        if (!cancelled) {
          setTrainee(payload.trainee);
          setPrograms(payload.programs);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainee.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const overall =
    programs && programs.length > 0
      ? Math.round(programs.reduce((sum, row) => sum + row.progress.overall.percent, 0) / programs.length)
      : 0;

  return (
    <>
      <AdminPageHeader
        title={trainee?.name ?? "Trainee"}
        subtitle={trainee?.email}
        crumbLabel={trainee?.name}
        actions={
          user && trainee && canDeleteRole(user.role, trainee.role) && user.id !== trainee.id ? (
            <button type="button" className={deleteUserButtonClass} onClick={() => setPendingDelete(trainee)}>
              Delete User
            </button>
          ) : null
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {programs === null && !error ? <LoadingState label="Loading trainee..." /> : null}
      {trainee && programs ? (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
            <p className="text-sm text-slate-500">Overall Progress</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{overall}%</p>
            <p className="mt-1 text-sm text-slate-500">
              {programs.length === 0 ? "Not enrolled in any programs yet." : `${programs.length} enrolled programs`}
            </p>
          </section>
          {programs.length === 0 ? (
            <EmptyState title="No enrolled programs yet" description="Trainers enroll trainees into approved programs." />
          ) : (
            programs.map((row) => <ProgramCard key={row.enrollmentId} row={row} />)
          )}
        </div>
      ) : null}
      <DeleteUserDialog
        user={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={() => {
          sessionStorage.setItem(USER_DELETED_NOTICE_KEY, "1");
          router.push("/admin/trainees");
        }}
      />
    </>
  );
}
