"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useAdminChrome } from "@/components/admin-shell";
import { listAdminCatalog } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { programAllowsAdminDelete, programTrainerNames } from "@/lib/programs/enrollment";
import { DeleteProgramDialog, deleteCourseButtonClass } from "@/features/programs/delete-program-dialog";
import type { ProgramSummary } from "@/types/program";

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const { searchQuery } = useAdminChrome();
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProgramSummary | null>(null);
  const isOps = user?.role === "ADMIN";

  useEffect(() => {
    listAdminCatalog()
      .then((payload) => {
        setPrograms(payload.programs);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load programs");
      });
  }, []);

  const visible = useMemo(() => {
    if (!programs) {
      return [];
    }
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return programs;
    }
    return programs.filter((program) =>
      `${program.title} ${program.category} ${program.status} ${programTrainerNames(program)}`.toLowerCase().includes(needle),
    );
  }, [programs, searchQuery]);

  return (
    <>
      <AdminPageHeader
        title={isOps ? "Programs" : "Courses"}
        subtitle={isOps ? "Review programs and monitor enrollments." : "Every program on the platform."}
      />
      {error ? <ErrorState message={error} /> : null}
      {programs === null && !error ? <LoadingState label="Loading programs..." /> : null}
      {programs && visible.length === 0 ? (
        <EmptyState title="No programs found" description="Programs created by trainers will appear here." />
      ) : null}
      {visible.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">{isOps ? "Program" : "Course"}</th>
                <th className="px-3 py-3 font-medium">Trainers</th>
                {isOps ? null : <th className="px-3 py-3 font-medium">Category</th>}
                {isOps ? <th className="px-3 py-3 font-medium">Submitted</th> : <th className="px-3 py-3 font-medium">Weeks</th>}
                {isOps ? <th className="px-3 py-3 font-medium">Trainees Enrolled</th> : null}
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((program) => (
                <tr key={program.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">{program.title}</td>
                  <td className="px-3 py-4 text-slate-600">{programTrainerNames(program)}</td>
                  {isOps ? (
                    <td className="px-3 py-4 text-slate-600">
                      {new Date(program.updatedAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  ) : (
                    <td className="px-3 py-4 text-slate-600">{program.category}</td>
                  )}
                  {isOps ? (
                    <td className="px-3 py-4 text-slate-600">{program._count?.enrollments ?? 0}</td>
                  ) : (
                    <td className="px-3 py-4 text-slate-600">{program._count?.weeks ?? 0}</td>
                  )}
                  <td className="px-5 py-4">
                    <StatusBadge status={program.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {isOps ? (
                        <Link href="/admin/approvals" className="text-sm font-medium text-violet-700 hover:text-violet-800">
                          Review
                        </Link>
                      ) : null}
                      {programAllowsAdminDelete(program.status) ? (
                        <button type="button" className={deleteCourseButtonClass} onClick={() => setPendingDelete(program)}>
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <DeleteProgramDialog
        asAdmin
        program={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(programId) => {
          setPrograms((current) => current?.filter((row) => row.id !== programId) ?? null);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
