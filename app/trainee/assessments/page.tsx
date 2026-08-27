"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TraineeShell } from "@/components/trainee-shell";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { listTraineeAssessments } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { friendlyLockReason } from "@/lib/learning/ux";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { AssessmentCatalog } from "@/types/assessment";

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

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Quizzes" user={user}>
      <section className={`${traineeCardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Your quizzes</h2>
          <p className="mt-1 text-sm text-slate-500">Check what&apos;s ready, locked, or already done.</p>
        </div>
        {error ? <p className="px-5 py-4 text-sm text-red-600">{error}</p> : null}
        {assessments.length === 0 && !error ? (
          <p className="px-5 py-6 text-sm text-slate-500">No quizzes yet. They&apos;ll appear here as you move through your journey.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assessments.map((item) => {
              const locked = item.assessment.status === "LOCKED";
              return (
                <li key={item.assessment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ContentTypeChip type="QUIZ" kind={item.assessment.kind} />
                      {item.passed ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Done</span>
                      ) : locked ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Locked</span>
                      ) : (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Up next</span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{item.assessment.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.assessment.location}
                      {item.bestScore !== null ? ` · best ${item.bestScore}%` : ""}
                    </p>
                    {locked ? (
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {friendlyLockReason(item.assessment.reason)}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/trainee/assessments/${item.assessment.id}`}
                    className={locked ? traineeSecondaryCtaClass : traineePrimaryCtaClass}
                  >
                    {locked ? "Why it's locked" : item.passed ? "Review" : "Continue"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </TraineeShell>
  );
}
