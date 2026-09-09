"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerTniView } from "@/features/training-tracker/tracker-tni";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerTniPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Extra support" user={user}>
      <TrackerTniView />
    </TrainerShell>
  );
}
