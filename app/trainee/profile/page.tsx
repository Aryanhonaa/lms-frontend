"use client";

import { TraineeShell } from "@/components/trainee-shell";
import { ProfileCard } from "@/features/profile/profile-card";
import { useAuth } from "@/providers/auth-provider";

export default function TraineeProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Profile" user={user}>
      <ProfileCard />
    </TraineeShell>
  );
}
