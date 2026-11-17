"use client";

import { useEffect, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTrainerFeedback, moderateFeedback } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { FeedbackItem, FeedbackModerationStatus } from "@/types/engagement";

const STATUSES: FeedbackModerationStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusClass(status: FeedbackModerationStatus): string {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (status === "PENDING") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-800 ring-rose-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function TrainerFeedbackPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackModerationStatus | "ALL">("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload(status: FeedbackModerationStatus | "ALL") {
    listTrainerFeedback()
      .then((payload) => {
        const rows =
          status === "ALL" ? payload.feedback : payload.feedback.filter((item) => item.status === status);
        setItems(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load feedback");
      });
  }

  useEffect(() => {
    reload(filter);
  }, [filter]);

  async function setStatus(id: string, status: FeedbackModerationStatus) {
    setBusyId(id);
    try {
      await moderateFeedback(id, status, "trainer");
      reload(filter);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to update feedback");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Feedback" user={user}>
      <div className="mb-4 rounded-2xl bg-violet-50 px-5 py-4 text-sm text-violet-950 ring-1 ring-violet-200">
        <p className="font-semibold">How feedback works</p>
        <p className="mt-1 text-violet-900/80">
          Trainees submit ratings from their Feedback page. New items arrive as <strong>pending</strong>. Approve to
          keep them, reject if they should not be used, or hide them. Pending does not block the course.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", ...STATUSES] as const).map((status) => {
          const active = filter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {status === "ALL" ? "All" : status.toLowerCase()}
            </button>
          );
        })}
      </div>
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      {items && items.length === 0 ? (
        <EmptyState
          title={filter === "PENDING" ? "No pending feedback" : "No feedback yet"}
          description="When trainees rate your programs, sessions, or materials, it will show up here for you to review."
        />
      ) : null}
      {items && items.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {item.author.name} · {item.rating}/5 · {item.targetKind.toLowerCase()}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClass(item.status)}`}>
                        {item.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.comment || "No comment"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.program?.title ?? "Program"} · {formatWhen(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50"
                        disabled={busyId === item.id || item.status === status}
                        onClick={() => void setStatus(item.id, status)}
                      >
                        {status === "APPROVED" ? "Approve" : status.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </TrainerShell>
  );
}
