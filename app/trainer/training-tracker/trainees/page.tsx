"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerTraineesView } from "@/features/training-tracker/tracker-trainees";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerTraineesPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="People" user={user}>
      <TrackerTraineesView trainerView />
    </TrainerShell>
  );
}
