"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { getFeedbackOptions, listTraineeFeedback, submitFeedback } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { FeedbackItem, FeedbackOptions, FeedbackTargetKind } from "@/types/engagement";

const TARGETS: Array<{ value: FeedbackTargetKind; label: string }> = [
  { value: "COURSE", label: "Course" },
  { value: "TRAINER", label: "Trainer" },
  { value: "SESSION", label: "Session" },
  { value: "MATERIAL", label: "Material" },
];

function statusLabel(status: FeedbackItem["status"]): string {
  return status.toLowerCase();
}

export default function TraineeFeedbackPage() {
  const { user } = useAuth();
  const [options, setOptions] = useState<FeedbackOptions | null>(null);
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetKind, setTargetKind] = useState<FeedbackTargetKind>("COURSE");
  const [targetId, setTargetId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    Promise.all([getFeedbackOptions(), listTraineeFeedback()])
      .then(([nextOptions, payload]) => {
        setOptions(nextOptions);
        setItems(payload.feedback);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load feedback");
      });
  }

  useEffect(() => {
    reload();
  }, []);

  const choices = useMemo(() => {
    if (!options) {
      return [];
    }
    if (targetKind === "COURSE") {
      return options.courses.map((row) => ({ id: row.id, label: row.title }));
    }
    if (targetKind === "TRAINER") {
      return options.trainers.map((row) => ({ id: row.id, label: `${row.name} · ${row.programTitle}` }));
    }
    if (targetKind === "SESSION") {
      return options.sessions.map((row) => ({ id: row.id, label: `${row.title} · ${row.programTitle}` }));
    }
    return options.materials.map((row) => ({ id: row.id, label: `${row.title} · ${row.kind.toLowerCase()}` }));
  }, [options, targetKind]);

  useEffect(() => {
    setTargetId(choices[0]?.id ?? "");
  }, [choices]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!targetId) {
      return;
    }
    setSaving(true);
    try {
      await submitFeedback({ targetKind, targetId, rating, comment: comment.trim() || undefined });
      setComment("");
      const payload = await listTraineeFeedback();
      setItems(payload.feedback);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to submit feedback");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Feedback" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="bg-white px-5 py-5">
          <h2 className="text-base font-medium text-stone-950">Share feedback</h2>
          <p className="mt-1 text-sm text-stone-600">
            Course reviews required for a certificate appear automatically when you complete a course. Use this form
            for other comments on trainers, sessions, or materials.
          </p>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="kind">
                Target
              </label>
              <select
                id="kind"
                className={`${fieldClass} mt-1`}
                value={targetKind}
                onChange={(event) => setTargetKind(event.target.value as FeedbackTargetKind)}
              >
                {TARGETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="target">
                {TARGETS.find((item) => item.value === targetKind)?.label}
              </label>
              <select
                id="target"
                className={`${fieldClass} mt-1`}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                disabled={choices.length === 0}
              >
                {choices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="rating">
                Rating
              </label>
              <select
                id="rating"
                className={`${fieldClass} mt-1 max-w-[8rem]`}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="comment">
                Comment
              </label>
              <textarea
                id="comment"
                className={`${fieldClass} mt-1 min-h-[96px]`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="What worked, and what should change?"
              />
            </div>
            <button type="submit" className={primaryButtonClass} disabled={saving || !targetId}>
              {saving ? "Sending…" : "Submit"}
            </button>
          </form>
        </section>
        <aside className="bg-white">
          <div className="border-b border-stone-200 px-5 py-3 text-sm font-medium">Your submissions</div>
          {items && items.length === 0 ? (
            <EmptyState title="None yet" description="Submitted feedback stays on your account, including pending reviews." />
          ) : null}
          {items && items.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-stone-950">
                    {item.rating}/5 · {item.targetKind.toLowerCase()}
                  </p>
                  <p className="mt-1 text-stone-600">{item.comment || "No comment"}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">{statusLabel(item.status)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>
    </TraineeShell>
  );
}
