"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { programAllowsBuilder, programAllowsEnrollment, programAllowsTrainerDelete } from "@/lib/programs/enrollment";
import { deleteCourseButtonClass } from "@/features/programs/delete-program-dialog";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { ProgramSummary } from "@/types/program";

export function ProgramList({
  programs,
  currentUserId,
  onDelete,
}: {
  programs: ProgramSummary[];
  currentUserId?: string;
  onDelete?: (program: ProgramSummary) => void;
}) {
  if (programs.length === 0) {
    return (
      <EmptyState
        title="No programs yet"
        description="Name a program and start with week 1. You can fill in catalog details later."
        actionHref="/trainer/programs/new"
        actionLabel="Create program"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-5 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {programs.map((program) => {
            const isOwner = !currentUserId || program.createdByUserId === currentUserId;
            return (
            <tr key={program.id}>
              <td className="px-5 py-4">
                <p className="font-medium text-slate-900">{program.title}</p>
                <p className="text-xs text-slate-500">{program._count?.weeks ?? 0} weeks</p>
              </td>
              <td className="px-4 py-4 text-slate-600">{program.category}</td>
              <td className="px-4 py-4 text-slate-600">{program.trainingMode}</td>
              <td className="px-4 py-4 text-slate-600">{program.durationWeeks} weeks</td>
              <td className="px-4 py-4">
                <StatusBadge status={program.status} />
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/trainer/programs/${program.id}`} className={secondaryButtonClass}>
                    Preview
                  </Link>
                  {isOwner && programAllowsBuilder(program.status) ? (
                    <Link href={`/trainer/programs/${program.id}/builder`} className={primaryButtonClass}>
                      Builder
                    </Link>
                  ) : null}
                  {programAllowsEnrollment(program.status) ? (
                    <Link href={`/trainer/programs/${program.id}/trainees`} className={primaryButtonClass}>
                      Batches
                    </Link>
                  ) : null}
                  {isOwner && onDelete && programAllowsTrainerDelete(program.status) ? (
                    <button type="button" className={deleteCourseButtonClass} onClick={() => onDelete(program)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
