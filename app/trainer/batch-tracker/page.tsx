"use client";

import { Suspense } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { LoadingState } from "@/components/ui/empty-state";
import { BatchTrackerBoard } from "@/features/batch-tracker/tracker-board";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerBatchTrackerPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Batch Tracker" user={user}>
      <Suspense fallback={<LoadingState label="Loading batches…" />}>
        <BatchTrackerBoard
          role="trainer"
          basePath="/trainer/batch-tracker"
          emptyHint="Create a batch, pick an approved course, assign co-trainers, then enroll trainees."
        />
      </Suspense>
    </TrainerShell>
  );
}
