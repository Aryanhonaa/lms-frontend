"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { listTrainerAssessments } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { TrainerAssessmentSummary } from "@/types/assessment";

export default function TrainerAssessmentsPage() {
  const { user } = useAuth();
  const filters = useTrainerCourseBatch();
  const [assessments, setAssessments] = useState<TrainerAssessmentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filters.ready) {
      return;
    }
    if (!filters.programId || !filters.batchId) {
      setAssessments([]);
      return;
    }
    let cancelled = false;
    listTrainerAssessments({ programId: filters.programId, batchId: filters.batchId })
      .then((payload) => {
        if (!cancelled) {
          setAssessments(payload.assessments);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAssessments(null);
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessments");
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
    <TrainerShell title="Assessments" user={user}>
      <section className="border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-base font-medium text-zinc-950 dark:text-zinc-50">Program assessments</h2>
          <p className="mt-1 text-sm text-zinc-500">Create quizzes in the program builder. Review attempts here.</p>
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
        {loadError ? <p className="px-5 py-4 text-sm text-red-600">{loadError}</p> : null}
        {filters.ready && filters.programs.length === 0 && !loadError ? (
          <p className="px-5 py-6 text-sm text-zinc-600">No courses assigned yet.</p>
        ) : null}
        {filters.ready && filters.programs.length > 0 && filters.batches.length === 0 && !loadError ? (
          <p className="px-5 py-6 text-sm text-zinc-600">Create a batch for this course to review assessment attempts.</p>
        ) : null}
        {assessments && assessments.length === 0 && filters.batchId && !loadError ? (
          <p className="px-5 py-6 text-sm text-zinc-600">No assessments authored yet.</p>
        ) : null}
        {assessments && assessments.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {assessments.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.programTitle ?? selectedCourse?.title} · {selectedBatch?.name} ·{" "}
                    {item.kind.replaceAll("_", " ").toLowerCase()} · {item.location} · {item.attemptCount} attempts
                  </p>
                </div>
                <Link
                  href={`/trainer/assessments/${item.id}?programId=${filters.programId}&batchId=${filters.batchId}`}
                  className="text-sm underline"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </TrainerShell>
  );
}
