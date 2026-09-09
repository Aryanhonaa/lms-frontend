"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrackerLcaView } from "@/features/training-tracker/tracker-lca";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerLcaPage() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Quality checks" user={user}>
      <TrackerLcaView />
    </TrainerShell>
  );
}
