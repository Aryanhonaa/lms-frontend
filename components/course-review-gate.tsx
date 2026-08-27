"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { listTraineeCertificates } from "@/lib/api/certificates";
import { submitFeedback } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { COURSE_REVIEW_CHECK_EVENT } from "@/lib/course-review";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { PendingCourseReview } from "@/types/certificate";

export function CourseReviewGate() {
  const titleId = useId();
  const pathname = usePathname();
  const [pending, setPending] = useState<PendingCourseReview | null>(null);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const payload = await listTraineeCertificates();
      setPending(payload.pendingReviews?.[0] ?? null);
    } catch {
      setPending(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    function onCheck() {
      void refresh();
    }
    window.addEventListener(COURSE_REVIEW_CHECK_EVENT, onCheck);
    return () => window.removeEventListener(COURSE_REVIEW_CHECK_EVENT, onCheck);
  }, [refresh]);

  useEffect(() => {
    if (!pending) {
      return;
    }
    setRating(5);
    setComment("");
    setError(null);
  }, [pending?.enrollmentId]);

  async function onSubmit() {
    if (!pending) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitFeedback({
        targetKind: "COURSE",
        targetId: pending.programId,
        enrollmentId: pending.enrollmentId,
        batchId: pending.batchId || undefined,
        rating,
        comment: comment.trim() || undefined,
      });
      await refresh();
      setDone(true);
      window.dispatchEvent(new Event(COURSE_REVIEW_CHECK_EVENT));
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to submit your review");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-slate-900/40" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            Review submitted
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {pending
              ? "Your certificate for this course is ready. Another completed course still needs a review."
              : "Your digital certificate is now available."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/trainee/certificates" className={primaryButtonClass} onClick={() => setDone(false)}>
              View certificate
            </Link>
            {pending ? (
              <button type="button" className={secondaryButtonClass} onClick={() => setDone(false)}>
                Review next course
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!pending) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-900/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            Course review
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-800">{pending.programTitle}</p>
          {pending.batchName ? <p className="mt-0.5 text-xs text-slate-500">{pending.batchName}</p> : null}
          <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
            Submitting your review is required to receive your certificate.
          </p>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Rating</p>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Course rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  className={`h-10 w-10 rounded-xl text-sm font-medium transition duration-150 ${
                    rating === value
                      ? "bg-violet-600 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setRating(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs uppercase tracking-wide text-slate-500" htmlFor="course-review-comment">
              Comment
            </label>
            <textarea
              id="course-review-comment"
              className={`${fieldClass} mt-1 min-h-[96px]`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What worked well, and what could improve?"
            />
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button type="submit" className={`${primaryButtonClass} mt-5 w-full`} disabled={saving}>
            {saving ? "Submitting…" : "Submit review and get certificate"}
          </button>
        </form>
      </div>
    </div>
  );
}
