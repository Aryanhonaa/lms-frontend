"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listTraineeEnrollments } from "@/lib/api/learning";
import {
  courseOptionsFromEnrollments,
  preferredEnrollment,
} from "@/lib/learning/enrollment-priority";
import type { EnrollmentSummary } from "@/types/learning";

type Options = {
  programId?: string;
  batchId?: string;
  /** When true, ignore a locked initial course and select the first available one. */
  preferAvailable?: boolean;
};

export function useTraineeEnrollment(initial?: Options) {
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [programId, setProgramIdState] = useState(initial?.programId ?? "");
  const [batchId, setBatchId] = useState(initial?.batchId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const userPickedRef = useRef(false);
  const preferAvailable = Boolean(initial?.preferAvailable);

  useEffect(() => {
    if (!initial?.programId || preferAvailable) {
      return;
    }
    setProgramIdState(initial.programId);
  }, [initial?.programId, preferAvailable]);

  useEffect(() => {
    let cancelled = false;
    listTraineeEnrollments()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setEnrollments(payload.enrollments);
        setProgramIdState((current) => {
          if (userPickedRef.current && current) {
            return current;
          }
          const preferred = preferredEnrollment(payload.enrollments, {
            programId: preferAvailable ? undefined : initial?.programId,
            batchId: preferAvailable ? undefined : initial?.batchId,
          });
          if (preferAvailable) {
            return preferred?.program.id ?? current ?? "";
          }
          if (initial?.programId) {
            const exact = payload.enrollments.find((row) => row.program.id === initial.programId);
            if (exact) {
              return exact.program.id;
            }
          }
          return current || preferred?.program.id || "";
        });
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
  }, [initial?.programId, initial?.batchId, preferAvailable]);

  const programs = useMemo(() => courseOptionsFromEnrollments(enrollments), [enrollments]);

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
      const preferred = preferredEnrollment(
        enrollments.filter((row) => row.program.id === programId),
        { programId, batchId: initial?.batchId },
      );
      return preferred?.batch?.id ?? batches[0]?.id ?? "";
    });
  }, [programId, batches, enrollments, initial?.batchId]);

  // If preferAvailable and the selected course is locked, jump to the unlocked one once.
  useEffect(() => {
    if (!preferAvailable || !ready || userPickedRef.current || enrollments.length === 0) {
      return;
    }
    const selected = enrollments.find((row) => row.program.id === programId);
    if (selected && !selected.sequenceLocked) {
      return;
    }
    const preferred = preferredEnrollment(enrollments);
    if (preferred && preferred.program.id !== programId) {
      setProgramIdState(preferred.program.id);
      setBatchId(preferred.batch?.id ?? "");
    }
  }, [preferAvailable, ready, enrollments, programId]);

  const setProgramId = useCallback((id: string) => {
    userPickedRef.current = true;
    setProgramIdState(id);
    setBatchId("");
  }, []);

  const setBatchIdTracked = useCallback((id: string) => {
    userPickedRef.current = true;
    setBatchId(id);
  }, []);

  const selected =
    enrollments.find((row) => row.program.id === programId && (!batchId || row.batch?.id === batchId)) ??
    enrollments.find((row) => row.program.id === programId) ??
    null;

  return {
    enrollments,
    programs,
    batches,
    programId,
    batchId,
    selected,
    setProgramId,
    setBatchId: setBatchIdTracked,
    error,
    ready,
  };
}
