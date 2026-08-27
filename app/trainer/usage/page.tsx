"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { AppUsagePanel } from "@/features/app-usage/app-usage-panel";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerUsagePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="App Usage Time" user={user}>
      <p className="mb-4 text-sm text-slate-500">Active LMS time for trainees in your courses and batches.</p>
      <AppUsagePanel audience="trainer" />
    </TrainerShell>
  );
}
