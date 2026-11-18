"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import {
  getAdminLeaderboard,
  getAdminLeaderboardFilters,
  getTraineeLeaderboard,
  getTraineeLeaderboardFilters,
  getTrainerLeaderboard,
  getTrainerLeaderboardFilters,
} from "@/lib/api/engagement";
import { coursesForFilterBatch } from "@/features/engagement/leaderboard-filters";
import type { LeaderboardBoard, LeaderboardFilterBatch } from "@/types/engagement";

type Role = "trainer" | "admin" | "trainee";

async function loadFilters(role: Role) {
  if (role === "admin") {
    return getAdminLeaderboardFilters();
  }
  if (role === "trainee") {
    return getTraineeLeaderboardFilters();
  }
  return getTrainerLeaderboardFilters();
}

async function loadBoard(role: Role, programId: string, batchId: string) {
  if (role === "admin") {
    return getAdminLeaderboard(programId, batchId);
  }
  if (role === "trainee") {
    return getTraineeLeaderboard(programId, batchId);
  }
  return getTrainerLeaderboard(programId, batchId);
}

export function useLeaderboardPage(role: Role) {
  const [filterBatches, setFilterBatches] = useState<LeaderboardFilterBatch[] | null>(null);
  const [board, setBoard] = useState<LeaderboardBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [programId, setProgramId] = useState("");
  const [courseBatchId, setCourseBatchId] = useState("");
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFilters(role)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setFilterBatches(payload.batches);
        const firstBatch = payload.batches[0];
        const firstCourse = firstBatch?.courses[0];
        setBatchId(firstBatch?.id ?? "");
        setProgramId(firstCourse?.id ?? "");
        setCourseBatchId(firstCourse?.batchId ?? "");
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load leaderboard");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!programId || !courseBatchId) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    setLoadingBoard(true);
    loadBoard(role, programId, courseBatchId)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setBoard(payload.boards[0] ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load leaderboard");
          setBoard(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBoard(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role, programId, courseBatchId]);

  const batches = useMemo(
    () => (filterBatches ?? []).map((batch) => ({ id: batch.id, name: batch.name })),
    [filterBatches],
  );
  const courses = useMemo(
    () => coursesForFilterBatch(filterBatches ?? [], batchId),
    [filterBatches, batchId],
  );

  function handleBatchChange(nextBatchId: string) {
    setBatchId(nextBatchId);
    const nextCourses = coursesForFilterBatch(filterBatches ?? [], nextBatchId);
    const first = nextCourses[0];
    setProgramId(first?.id ?? "");
    setCourseBatchId(first?.batchId ?? "");
  }

  function handleCourseChange(nextProgramId: string, nextCourseBatchId: string) {
    setProgramId(nextProgramId);
    setCourseBatchId(nextCourseBatchId);
  }

  return {
    batches,
    courses,
    batchId,
    programId,
    board,
    error,
    loadingBoard,
    loadingFilters: filterBatches === null && !error,
    empty: filterBatches !== null && filterBatches.length === 0,
    handleBatchChange,
    handleCourseChange,
  };
}
