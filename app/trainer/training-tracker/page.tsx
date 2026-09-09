"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerDashboardView } from "@/features/training-tracker/tracker-dashboard";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Batches" user={user}>
      <TrackerDashboardView />
    </TrainerShell>
  );
}
