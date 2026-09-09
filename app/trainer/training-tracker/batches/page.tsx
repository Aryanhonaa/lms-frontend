"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerBatchesView } from "@/features/training-tracker/tracker-batches";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerBatchesPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Batches" user={user}>
      <TrackerBatchesView />
    </TrainerShell>
  );
}
