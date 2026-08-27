"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { listTrainerAssignments } from "@/lib/api/assignments";
import { ApiClientError } from "@/lib/api/client";
import { primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { TrainerAssignmentSummary } from "@/types/assignment";

export default function TrainerAssignmentsPage() {
  const { user } = useAuth();
  const filters = useTrainerCourseBatch();
  const [assignments, setAssignments] = useState<TrainerAssignmentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filters.ready) {
      return;
    }
    if (!filters.programId || !filters.batchId) {
      setAssignments([]);
      return;
    }
    let cancelled = false;
    listTrainerAssignments({ programId: filters.programId, batchId: filters.batchId })
      .then((payload) => {
        if (!cancelled) {
          setAssignments(payload.assignments);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAssignments(null);
          setError(err instanceof ApiClientError ? err.message : "Unable to load assignments");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.ready, filters.programId, filters.batchId]);

  if (!user) {
    return null;
  }

  const selectedBatch = filters.batches.find((row) => row.id === filters.batchId);
  const selectedCourse = filters.programs.find((row) => row.id === filters.programId);
  const loadError = error ?? filters.error;

  return (
    <TrainerShell title="Assignments" user={user}>
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">Assignment review</h2>
          <div className="mt-4">
            <TrainerCourseBatchFilters
              programs={filters.programs}
              batches={filters.batches}
              programId={filters.programId}
              batchId={filters.batchId}
              onProgramChange={filters.setProgramId}
              onBatchChange={filters.setBatchId}
            />
          </div>
        </div>
        {loadError ? (
          <div className="px-5 py-4">
            <ErrorState message={loadError} />
          </div>
        ) : null}
        {!filters.ready && !loadError ? (
          <div className="px-5">
            <LoadingState label="Loading assignments…" />
          </div>
        ) : null}
        {filters.ready && filters.programs.length === 0 && !loadError ? (
          <div className="px-5 py-6">
            <EmptyState title="No courses yet." description="Create a course before reviewing assignment submissions." />
          </div>
        ) : null}
        {filters.ready && filters.programs.length > 0 && filters.batches.length === 0 && !loadError ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No batches yet."
              description="Create a batch for this course to review trainee submissions."
            />
          </div>
        ) : null}
        {assignments && assignments.length === 0 && filters.batchId && !loadError ? (
          <div className="px-5 py-6">
            <EmptyState
              title="No assignments yet."
              description="Add an assignment to a day in the program builder, then review trainee work here."
            />
          </div>
        ) : null}
        {assignments && assignments.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {assignments.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.programTitle ?? selectedCourse?.title} · {selectedBatch?.name} · {item.location} ·{" "}
                    {item.submissionCount} submissions · {item.pendingReview} to review
                  </p>
                </div>
                <Link
                  href={`/trainer/assignments/${item.id}?programId=${filters.programId}&batchId=${filters.batchId}`}
                  className={primaryButtonClass}
                >
                  Review submissions
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </TrainerShell>
  );
}
