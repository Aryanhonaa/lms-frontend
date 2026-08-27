"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTraineeAchievements } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { AchievementItem } from "@/types/engagement";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TraineeAchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTraineeAchievements()
      .then((payload) => {
        setAchievements(payload.achievements);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load achievements");
      });
  }, []);

  if (!user) {
    return null;
  }

  const earned = achievements?.filter((item) => item.earned).length ?? 0;

  return (
    <TraineeShell title="Achievements" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {achievements === null && !error ? <LoadingState /> : null}
      {achievements && achievements.length === 0 ? (
        <EmptyState title="No achievements configured" description="Your awards are evaluated from learning activity on the server." />
      ) : null}
      {achievements && achievements.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-stone-600">
            {earned} of {achievements.length} earned from real progress, assessments, attendance, and rank.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {achievements.map((item) => (
              <li
                key={item.id}
                className={`bg-white px-5 py-5 ${item.earned ? "" : "opacity-60"}`}
              >
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  {item.earned ? "Earned" : "Locked"}
                </p>
                <h2 className="mt-1 text-base font-medium text-stone-950">{item.title}</h2>
                <p className="mt-2 text-sm text-stone-600">{item.description}</p>
                {item.earnedAt ? (
                  <p className="mt-3 text-xs text-stone-500">{formatWhen(item.earnedAt)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </TraineeShell>
  );
}
