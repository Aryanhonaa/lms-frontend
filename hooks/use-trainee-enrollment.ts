"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listTraineeEnrollments } from "@/lib/api/learning";
import type { EnrollmentSummary } from "@/types/learning";

export function useTraineeEnrollment(initial?: { programId?: string; batchId?: string }) {
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [programId, setProgramIdState] = useState(initial?.programId ?? "");
  const [batchId, setBatchId] = useState(initial?.batchId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initial?.programId) {
      setProgramIdState(initial.programId);
    }
  }, [initial?.programId]);

  useEffect(() => {
    let cancelled = false;
    listTraineeEnrollments()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setEnrollments(payload.enrollments);
        setProgramIdState((current) => current || initial?.programId || payload.enrollments[0]?.program.id || "");
        setError(null);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load your courses");
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initial?.programId]);

  const programs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of enrollments) {
      if (!seen.has(row.program.id)) {
        seen.set(row.program.id, row.program.title);
      }
    }
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [enrollments]);

  const batches = useMemo(
    () =>
      enrollments
        .filter((row) => row.program.id === programId && row.batch)
        .map((row) => row.batch as { id: string; name: string }),
    [enrollments, programId],
  );

  useEffect(() => {
    if (!programId) {
      setBatchId("");
      return;
    }
    setBatchId((current) => {
      if (current && batches.some((row) => row.id === current)) {
        return current;
      }
      if (initial?.batchId && batches.some((row) => row.id === initial.batchId)) {
        return initial.batchId;
      }
      return batches[0]?.id ?? "";
    });
  }, [programId, batches, initial?.batchId]);

  const setProgramId = useCallback((id: string) => {
    setProgramIdState(id);
    setBatchId("");
  }, []);

  const selected = enrollments.find(
    (row) => row.program.id === programId && (!batchId || row.batch?.id === batchId),
  ) ?? enrollments.find((row) => row.program.id === programId) ?? null;

  return {
    enrollments,
    programs,
    batches,
    programId,
    batchId,
    selected,
    setProgramId,
    setBatchId,
    error,
    ready,
  };
}
