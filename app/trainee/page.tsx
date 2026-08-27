"use client";

import { TraineeShell } from "@/components/trainee-shell";
import { TraineeDashboard } from "@/features/trainee/trainee-dashboard";
import { useAuth } from "@/providers/auth-provider";

export default function TraineePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Dashboard" user={user} hideHeader>
      <TraineeDashboard user={user} />
    </TraineeShell>
  );
}
