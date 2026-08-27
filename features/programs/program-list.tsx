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
  onDelete,
}: {
  programs: ProgramSummary[];
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
    <div className="overflow-x-auto bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {programs.map((program) => (
            <tr key={program.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{program.title}</p>
                <p className="text-xs text-stone-500">{program._count?.weeks ?? 0} weeks</p>
              </td>
              <td className="px-4 py-3 text-stone-600">{program.category}</td>
              <td className="px-4 py-3 text-stone-600">{program.trainingMode}</td>
              <td className="px-4 py-3 text-stone-600">{program.durationWeeks} weeks</td>
              <td className="px-4 py-3">
                <StatusBadge status={program.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/trainer/programs/${program.id}`} className={secondaryButtonClass}>
                    Preview
                  </Link>
                  {programAllowsBuilder(program.status) ? (
                    <Link href={`/trainer/programs/${program.id}/builder`} className={primaryButtonClass}>
                      Builder
                    </Link>
                  ) : null}
                  {programAllowsEnrollment(program.status) ? (
                    <Link href={`/trainer/programs/${program.id}/trainees`} className={primaryButtonClass}>
                      Batches
                    </Link>
                  ) : null}
                  {onDelete && programAllowsTrainerDelete(program.status) ? (
                    <button type="button" className={deleteCourseButtonClass} onClick={() => onDelete(program)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
