"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { ProfileCard } from "@/features/profile/profile-card";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Profile" user={user}>
      <ProfileCard />
    </TrainerShell>
  );
}
