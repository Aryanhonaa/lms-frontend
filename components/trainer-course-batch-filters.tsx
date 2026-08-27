"use client";

import { fieldClass } from "@/lib/ui/form-classes";
import type { ProgramBatch } from "@/lib/api/batches";
import type { ProgramSummary } from "@/types/program";

type Props = {
  programs: ProgramSummary[];
  batches: ProgramBatch[];
  programId: string;
  batchId: string;
  onProgramChange: (programId: string) => void;
  onBatchChange: (batchId: string) => void;
  programDisabled?: boolean;
};

export function TrainerCourseBatchFilters({
  programs,
  batches,
  programId,
  batchId,
  onProgramChange,
  onBatchChange,
  programDisabled = false,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="trainer-course">
        Course
        <select
          id="trainer-course"
          className={`${fieldClass} mt-1 font-normal normal-case`}
          value={programId}
          disabled={programDisabled || programs.length === 0}
          onChange={(event) => onProgramChange(event.target.value)}
        >
          {programs.length === 0 ? <option value="">No courses</option> : null}
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="trainer-batch">
        Batch
        <select
          id="trainer-batch"
          className={`${fieldClass} mt-1 font-normal normal-case`}
          value={batchId}
          disabled={batches.length === 0}
          onChange={(event) => onBatchChange(event.target.value)}
        >
          {batches.length === 0 ? <option value="">No batches</option> : null}
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
