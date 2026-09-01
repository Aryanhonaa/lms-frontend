"use client";

import { useEffect, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTrainerFeedback } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { FeedbackItem } from "@/types/engagement";

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TrainerFeedbackPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainerFeedback()
      .then((payload) => {
        setItems(payload.feedback);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load feedback");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Feedback" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      {items && items.length === 0 ? (
        <EmptyState title="No feedback yet" description="When trainees rate your programs, sessions, or materials, it will show up here." />
      ) : null}
      {items && items.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {item.author.name} · {item.rating}/5 · {item.targetKind.toLowerCase()}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status.toLowerCase()}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.comment || "No comment"}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.program?.title ?? "Program"} · {formatWhen(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </TrainerShell>
  );
}
