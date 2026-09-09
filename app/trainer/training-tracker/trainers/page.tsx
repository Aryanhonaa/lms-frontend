"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerTrainersView } from "@/features/training-tracker/tracker-trainers";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerTrainersPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="By trainer" user={user}>
      <TrackerTrainersView />
    </TrainerShell>
  );
}
