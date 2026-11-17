"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Lock } from "lucide-react";
import { TraineeShell } from "@/components/trainee-shell";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { listTraineeAssessments } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { friendlyLockReason } from "@/lib/learning/ux";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { AssessmentCatalog } from "@/types/assessment";

function answersReady(item: AssessmentCatalog): boolean {
  return Boolean(item.assessment.answersVisible) && item.attempts.some((row) => row.status !== "IN_PROGRESS");
}

export default function TraineeAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentCatalog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTraineeAssessments()
      .then((payload) => {
        setAssessments(payload.assessments);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load quizzes");
      });
  }, []);

  const reviewable = useMemo(() => assessments.filter(answersReady), [assessments]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Quizzes" user={user}>
      <div className="flex flex-col gap-5">
        {reviewable.length > 0 ? (
          <section className={`${traineeCardClass} overflow-hidden`}>
            <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-emerald-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm shadow-teal-600/20">
                  <Eye className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Answers ready to review</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Your trainer released marked answers for {reviewable.length} quiz
                    {reviewable.length === 1 ? "" : "zes"}. Open any one to see your answers, the correct answers, and
                    marks.
                  </p>
                </div>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {reviewable.map((item) => (
                <li
                  key={`review-${item.assessment.id}`}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ContentTypeChip type="QUIZ" kind={item.assessment.kind} />
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
                        Released
                      </span>
                      {item.passed ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Passed
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{item.assessment.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.assessment.location}
                      {item.bestScore !== null ? ` · your score ${item.bestScore}%` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/trainee/assessments/${item.assessment.id}?review=answers`}
                    className={traineePrimaryCtaClass}
                  >
                    <Eye className="h-4 w-4" />
                    Review answers
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${traineeCardClass} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Your quizzes</h2>
            <p className="mt-1 text-sm text-slate-500">Check what&apos;s ready, locked, or already done.</p>
          </div>
          {error ? <p className="px-5 py-4 text-sm text-red-600">{error}</p> : null}
          {assessments.length === 0 && !error ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No quizzes yet. They&apos;ll appear here as you move through your journey.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assessments.map((item) => {
                const locked = item.assessment.status === "LOCKED";
                const ready = answersReady(item);
                return (
                  <li
                    key={item.assessment.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ContentTypeChip type="QUIZ" kind={item.assessment.kind} />
                        {ready ? (
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                            Answers ready
                          </span>
                        ) : null}
                        {item.passed ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Done
                          </span>
                        ) : locked ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Locked
                          </span>
                        ) : (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            Up next
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-semibold text-slate-900">{item.assessment.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.assessment.location}
                        {item.bestScore !== null ? ` · best ${item.bestScore}%` : ""}
                      </p>
                      {ready ? (
                        <p className="mt-1.5 text-sm text-teal-700">Your trainer released answer review for this quiz.</p>
                      ) : null}
                      {locked && !ready ? (
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {friendlyLockReason(item.assessment.reason)}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={
                        ready
                          ? `/trainee/assessments/${item.assessment.id}?review=answers`
                          : `/trainee/assessments/${item.assessment.id}`
                      }
                      className={ready || !locked ? traineePrimaryCtaClass : traineeSecondaryCtaClass}
                    >
                      {ready ? (
                        <>
                          <Eye className="h-4 w-4" />
                          Review answers
                        </>
                      ) : locked ? (
                        "Why it's locked"
                      ) : item.passed ? (
                        "Open"
                      ) : (
                        "Continue"
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </TraineeShell>
  );
}
