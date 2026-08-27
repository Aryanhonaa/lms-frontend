"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listAdminFeedback, moderateFeedback } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import type { FeedbackItem, FeedbackModerationStatus } from "@/types/engagement";

const CARD =
  "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

const STATUSES: FeedbackModerationStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackModerationStatus | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload(status?: FeedbackModerationStatus) {
    listAdminFeedback(status)
      .then((payload) => {
        setItems(payload.feedback);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load feedback");
      });
  }

  useEffect(() => {
    reload(filter === "ALL" ? undefined : filter);
  }, [filter]);

  async function setStatus(id: string, status: FeedbackModerationStatus) {
    setBusyId(id);
    try {
      await moderateFeedback(id, status);
      reload(filter === "ALL" ? undefined : filter);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to moderate");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Feedback"
        subtitle="Review trainee ratings before they become public on a program."
        actions={
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value as FeedbackModerationStatus | "ALL")}
          >
            <option value="ALL">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.toLowerCase()}
              </option>
            ))}
          </select>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      {items && items.length === 0 ? (
        <EmptyState title="No feedback" description="Trainee submissions will appear here for moderation." />
      ) : null}
      {items && items.length > 0 ? (
        <section className={CARD}>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.author.name} · {item.rating}/5 · {item.targetKind.toLowerCase()}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{item.comment || "No comment"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.program?.title ?? "No program"} · {formatWhen(item.createdAt)} · {item.status.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50"
                        disabled={busyId === item.id || item.status === status}
                        onClick={() => setStatus(item.id, status)}
                      >
                        {status.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
