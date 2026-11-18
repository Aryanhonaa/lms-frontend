"use client";

import { fieldClass } from "@/lib/ui/form-classes";
import type { LeaderboardCourse, LeaderboardFilterBatch } from "@/types/engagement";

export type LeaderboardBatchOption = {
  id: string;
  name: string;
};

export function coursesForFilterBatch(
  batches: LeaderboardFilterBatch[],
  batchId: string,
): LeaderboardCourse[] {
  return batches.find((batch) => batch.id === batchId)?.courses ?? [];
}

export function LeaderboardFilters({
  batches,
  courses,
  batchId,
  programId,
  onBatchChange,
  onCourseChange,
  disabled = false,
}: {
  batches: LeaderboardBatchOption[];
  courses: LeaderboardCourse[];
  batchId: string;
  programId: string;
  onBatchChange: (batchId: string) => void;
  onCourseChange: (programId: string, courseBatchId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5 sm:p-5">
      <div className="grid items-end gap-3 sm:grid-cols-2 sm:gap-4">
        <label className="block min-w-0 text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="leaderboard-batch">
          Batch
          <select
            id="leaderboard-batch"
            className={`${fieldClass} mt-1.5 font-normal normal-case`}
            value={batchId}
            disabled={disabled || batches.length === 0}
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
        <label className="block min-w-0 text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="leaderboard-course">
          Course
          <select
            id="leaderboard-course"
            className={`${fieldClass} mt-1.5 font-normal normal-case`}
            value={programId}
            disabled={disabled || !batchId || courses.length === 0}
            onChange={(event) => {
              const nextProgramId = event.target.value;
              const course = courses.find((item) => item.id === nextProgramId);
              onCourseChange(nextProgramId, course?.batchId ?? "");
            }}
          >
            {!batchId ? <option value="">Select a batch first</option> : null}
            {batchId && courses.length === 0 ? <option value="">No courses in this batch</option> : null}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
