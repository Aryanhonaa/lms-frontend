"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { TrainerDashboard } from "@/features/trainer/trainer-dashboard";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Dashboard" user={user} hideHeader>
      <TrainerDashboard user={user} />
    </TrainerShell>
  );
}
