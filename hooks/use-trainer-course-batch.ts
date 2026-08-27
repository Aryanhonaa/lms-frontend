"use client";

import { useCallback, useEffect, useState } from "react";
import { listProgramBatches, type ProgramBatch } from "@/lib/api/batches";
import { listTrainerPrograms } from "@/lib/api/programs";
import type { ProgramSummary } from "@/types/program";

export function useTrainerCourseBatch(initial?: { programId?: string; batchId?: string }) {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [batches, setBatches] = useState<ProgramBatch[]>([]);
  const [programId, setProgramIdState] = useState(initial?.programId ?? "");
  const [batchId, setBatchId] = useState(initial?.batchId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [programsLoaded, setProgramsLoaded] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);

  useEffect(() => {
    if (initial?.programId) {
      setProgramIdState(initial.programId);
    }
  }, [initial?.programId]);

  useEffect(() => {
    let cancelled = false;
    listTrainerPrograms()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setPrograms(payload.programs);
        setProgramIdState((current) => current || payload.programs[0]?.id || "");
        setError(null);
        setProgramsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load courses");
          setProgramsLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!programId) {
      setBatches([]);
      setBatchId("");
      setBatchesLoaded(programsLoaded);
      return;
    }
    let cancelled = false;
    setBatchesLoaded(false);
    listProgramBatches(programId)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setBatches(payload.batches);
        setBatchId((current) => {
          if (current && payload.batches.some((row) => row.id === current)) {
            return current;
          }
          if (initial?.batchId && payload.batches.some((row) => row.id === initial.batchId)) {
            return initial.batchId;
          }
          return payload.batches[0]?.id ?? "";
        });
        setError(null);
        setBatchesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load batches");
          setBatchesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [programId, initial?.batchId, programsLoaded]);

  const setProgramId = useCallback((id: string) => {
    setProgramIdState(id);
    setBatchId("");
  }, []);

  return {
    programs,
    batches,
    programId,
    batchId,
    setProgramId,
    setBatchId,
    error,
    ready: programsLoaded && batchesLoaded,
  };
}
