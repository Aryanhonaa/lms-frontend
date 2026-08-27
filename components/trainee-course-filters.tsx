"use client";

import { fieldClass } from "@/lib/ui/form-classes";

type CourseOption = { id: string; title: string };
type BatchOption = { id: string; name: string };

type Props = {
  programs: CourseOption[];
  batches: BatchOption[];
  programId: string;
  batchId: string;
  onProgramChange: (programId: string) => void;
  onBatchChange: (batchId: string) => void;
};

const selectClass = `${fieldClass} rounded-xl border-slate-200 font-normal normal-case shadow-sm`;

export function TraineeCourseFilters({
  programs,
  batches,
  programId,
  batchId,
  onProgramChange,
  onBatchChange,
}: Props) {
  const showCourse = programs.length > 1;
  const showClass = batches.length > 1;
  if (!showCourse && !showClass) {
    return null;
  }

  return (
    <div className={`grid gap-3 ${showCourse && showClass ? "sm:grid-cols-2" : ""}`}>
      {showCourse ? (
        <label className="block text-xs font-medium text-slate-500" htmlFor="trainee-course">
          Course
          <select
            id="trainee-course"
            className={`${selectClass} mt-1`}
            value={programId}
            onChange={(event) => onProgramChange(event.target.value)}
          >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showClass ? (
        <label className="block text-xs font-medium text-slate-500" htmlFor="trainee-class">
          Class
          <select
            id="trainee-class"
            className={`${selectClass} mt-1`}
            value={batchId}
            onChange={(event) => onBatchChange(event.target.value)}
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
