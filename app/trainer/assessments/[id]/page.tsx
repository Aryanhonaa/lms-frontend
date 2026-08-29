"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { getTrainerAssessment } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerAssessmentDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get("programId") ?? "";
  const urlBatchId = searchParams.get("batchId") ?? "";
  const [resolvedProgramId, setResolvedProgramId] = useState(urlProgramId);
  const filters = useTrainerCourseBatch({
    programId: urlProgramId || resolvedProgramId || undefined,
    batchId: urlBatchId || undefined,
  });
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getTrainerAssessment>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlProgramId || !params.id) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id)
      .then((data) => {
        if (!cancelled) {
          setResolvedProgramId(data.assessment.programId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, urlProgramId]);

  useEffect(() => {
    if (!params.id || !filters.ready || !filters.programId || !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id, { programId: filters.programId, batchId: filters.batchId })
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setResolvedProgramId(data.assessment.programId);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, filters.ready, filters.programId, filters.batchId]);

  function onBatchChange(batchId: string) {
    filters.setBatchId(batchId);
    const next = new URLSearchParams();
    if (filters.programId) {
      next.set("programId", filters.programId);
    }
    next.set("batchId", batchId);
    router.replace(`${pathname}?${next.toString()}`);
  }

  if (!user) {
    return null;
  }

  const selectedBatch = filters.batches.find((row) => row.id === filters.batchId);
  const loadError = error ?? filters.error;

  return (
    <TrainerShell title={payload?.assessment.title ?? "Quiz"} user={user} crumbLabel={payload?.assessment.title}>
      <div className="mb-4">
        <TrainerCourseBatchFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          hideProgram
          onProgramChange={filters.setProgramId}
          onBatchChange={onBatchChange}
        />
      </div>
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {filters.ready && filters.batches.length === 0 && !loadError ? (
        <p className="text-sm text-zinc-600">Create a batch for this course to review attempts.</p>
      ) : null}
      {payload ? (
        <section className="border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 text-sm text-zinc-600 dark:border-zinc-800">
            {payload.assessment.programTitle} · {selectedBatch?.name} · {payload.assessment.location} ·{" "}
            {payload.assessment.questionBankCount > payload.assessment.questionCount
              ? `${payload.assessment.questionCount} of ${payload.assessment.questionBankCount} questions`
              : `${payload.assessment.questionCount} questions`}{" "}
            · pass {payload.assessment.passingScore}%
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {payload.attempts.length === 0 ? (
              <li className="px-5 py-6 text-sm text-zinc-500">No trainee attempts in this batch yet.</li>
            ) : (
              payload.attempts.map((attempt) => (
                <li key={attempt.id} className="px-5 py-4 text-sm">
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">{attempt.trainee.name}</p>
                  <p className="mt-1 text-zinc-500">
                    Attempt {attempt.attemptNumber} · {attempt.status.toLowerCase().replaceAll("_", " ")}
                    {attempt.score !== null ? ` · ${attempt.score}%` : ""}
                    {attempt.passed === true ? " · passed" : attempt.passed === false ? " · failed" : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </TrainerShell>
  );
}
