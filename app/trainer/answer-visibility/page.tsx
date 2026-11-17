"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { AnswerVisibilityManager } from "@/features/assessments/answer-visibility-manager";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerAnswerVisibilityPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Answer visibility" user={user}>
      <AnswerVisibilityManager />
    </TrainerShell>
  );
}
