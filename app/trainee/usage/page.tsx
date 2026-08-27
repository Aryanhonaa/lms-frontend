"use client";

import { TraineeShell } from "@/components/trainee-shell";
import { AppUsagePanel } from "@/features/app-usage/app-usage-panel";
import { useAuth } from "@/providers/auth-provider";

export default function TraineeUsagePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="App Usage Time" user={user}>
      <AppUsagePanel audience="trainee" />
    </TraineeShell>
  );
}
