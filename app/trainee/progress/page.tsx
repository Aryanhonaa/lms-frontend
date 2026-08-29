"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight, Lock, Play } from "lucide-react";
import { CourseOutcomePanel } from "@/components/course-outcome";
import { TraineeCourseFilters } from "@/components/trainee-course-filters";
import { TraineeShell } from "@/components/trainee-shell";
import { ContentTypeChip, ContentTypeIcon } from "@/components/learning/content-type-chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { getTraineeProgress } from "@/lib/api/progress";
import { ApiClientError } from "@/lib/api/client";
import { traineePathHref } from "@/lib/learning/path";
import {
  friendlyLockReason,
  learnTypeFromKind,
  locationLabel,
  progressHeadline,
  statusCopy,
} from "@/lib/learning/ux";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { ProgressActivity, ProgressView } from "@/types/progress";

function activityHref(programId: string, activity: ProgressActivity, batchId?: string): string {
  if (activity.kind === "ASSIGNMENT") {
    return `/trainee/assignments/${activity.id}`;
  }
  if (
    activity.kind === "PRACTICE_QUIZ" ||
    activity.kind === "WEEKLY_QUIZ" ||
    activity.kind === "WEEKLY_EXAM" ||
    activity.kind === "MILESTONE_EXAM" ||
    activity.kind === "FINAL_EXAM"
  ) {
    return `/trainee/assessments/${activity.id}`;
  }
  return traineePathHref(programId, { type: activity.kind, id: activity.id }, batchId);
}

function ProgressClient() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("programId") ?? "";
  const requestedBatch = searchParams.get("batchId") ?? "";
  const filters = useTraineeEnrollment({
    programId: requestedId || undefined,
    batchId: requestedBatch || undefined,
  });
  const [view, setView] = useState<ProgressView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replaceScope(programId: string, batchId: string) {
    const params = new URLSearchParams();
    params.set("programId", programId);
    if (batchId) {
      params.set("batchId", batchId);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (!filters.ready || !filters.programId) {
      if (filters.ready && filters.enrollments.length === 0) {
        setView(null);
      }
      return;
    }
    if (filters.batches.length > 0 && !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTraineeProgress(filters.programId, filters.batchId || undefined)
      .then((progress) => {
        if (!cancelled) {
          setView(progress);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load progress");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.ready, filters.programId, filters.batchId]);

  if (!user) {
    return null;
  }

  const loadError = error ?? filters.error;
  const headline = view
    ? progressHeadline(
        view.overall.completedItems,
        view.overall.completedItems + view.overall.remainingItems,
        view.overall.percent,
        view.course.outcome,
      )
    : "Your Journey";

  return (
    <TraineeShell title="Your Journey" user={user}>
      <div className="mb-4">
        <TraineeCourseFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          onProgramChange={(id) => {
            filters.setProgramId(id);
            const firstBatch = filters.enrollments.find((row) => row.program.id === id)?.batch?.id ?? "";
            replaceScope(id, firstBatch);
          }}
          onBatchChange={(id) => {
            filters.setBatchId(id);
            replaceScope(filters.programId, id);
          }}
        />
      </div>
      {loadError ? <ErrorState message={loadError} /> : null}
      {!filters.ready && !loadError ? <LoadingState /> : null}
      {filters.ready && filters.enrollments.length === 0 && !loadError ? (
        <EmptyState
          title="Your journey starts soon"
          description="When you join a course, progress, checkpoints, and what’s next will live here."
        />
      ) : null}
      {view ? (
        <div className="space-y-6">
          <section className={`${traineeCardClass} overflow-hidden`}>
            <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/50 px-5 py-6 md:px-6">
              <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Your Journey</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{view.program.title}</h2>
              <p className="mt-2 text-sm font-medium text-slate-700">{headline}</p>
              <p className="mt-1 text-sm text-slate-500">
                {view.overall.completedItems} of {view.overall.completedItems + view.overall.remainingItems} completed
              </p>
              <div className="mt-4 max-w-md">
                <ProgressBar value={view.overall.percent} tone="violet" size="md" />
              </div>
              <div className="mt-4 max-w-md">
                <CourseOutcomePanel course={view.course} />
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <section className={`${traineeCardClass} px-5 py-5`}>
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Chapters</p>
                <ul className="mt-3 space-y-4">
                  {view.weekProgress.map((week) => {
                    const locked = week.status === "LOCKED";
                    const copy = statusCopy(week.status);
                    return (
                      <li key={week.id} className="rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-950/5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{week.title}</p>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${copy.className}`}>
                            {copy.label}
                          </span>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={week.percent} tone="violet" />
                        </div>
                        {locked && week.reason ? (
                          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
                            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {friendlyLockReason(week.reason)}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-medium text-slate-500">
                            {week.percent >= 85 && week.percent < 100 ? "Almost there" : `${Math.round(week.percent)}% complete`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={`${traineeCardClass} px-5 py-5`}>
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Checkpoints</p>
                {view.milestones.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No checkpoints in this course yet.</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {view.milestones.map((milestone) => (
                      <li key={milestone.id} className="rounded-2xl px-1 py-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {milestone.satisfied ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {milestone.requirements.map((requirement) => (
                            <li key={requirement.id} className="flex items-start gap-2 text-slate-700">
                              {requirement.complete ? (
                                <Check className="mt-0.5 h-4 w-4 text-emerald-600" strokeWidth={3} />
                              ) : (
                                <Lock className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                              )}
                              <span>
                                {requirement.label}
                                <span className="ml-2 text-slate-400">{requirement.display}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        {milestone.exam ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Quiz: {milestone.exam.title}
                            {milestone.exam.reason ? ` · ${friendlyLockReason(milestone.exam.reason)}` : ""}
                          </p>
                        ) : null}
                        {!milestone.satisfied && milestone.reason ? (
                          <p className="mt-2 text-sm text-slate-500">{friendlyLockReason(milestone.reason)}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className={`${traineeCardClass} px-5 py-4`}>
                <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Where you are</p>
                {view.currentActivity ? (
                  <div className="mt-3 flex items-start gap-3">
                    <ContentTypeIcon type={learnTypeFromKind(view.currentActivity.kind)} kind={view.currentActivity.kind} size="sm" />
                    <div>
                      <ContentTypeChip type={learnTypeFromKind(view.currentActivity.kind)} kind={view.currentActivity.kind} />
                      <p className="mt-2 text-sm font-semibold text-slate-900">{view.currentActivity.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {locationLabel(view.currentActivity.weekTitle, view.currentActivity.dayTitle)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">You&apos;re caught up.</p>
                )}
              </section>
              <section className={`${traineeCardClass} px-5 py-4`}>
                <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Up Next</p>
                {view.nextActivity ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{view.nextActivity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {locationLabel(view.nextActivity.weekTitle, view.nextActivity.dayTitle)}
                    </p>
                    <Link
                      href={activityHref(view.program.id, view.nextActivity, filters.batchId)}
                      className={`${traineePrimaryCtaClass} mt-4 w-full`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Continue Learning
                    </Link>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Nothing waiting right now.</p>
                )}
              </section>
              <section className={`${traineeCardClass} px-5 py-4 text-sm`}>
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Final stretch</p>
                {view.finalExam.configured ? (
                  <>
                    <p className="mt-2 font-semibold text-slate-900">
                      {view.finalExam.eligible ? "Ready to unlock" : "Still locked"}
                    </p>
                    {view.finalExam.reason ? (
                      <p className="mt-1 text-slate-500">{friendlyLockReason(view.finalExam.reason)}</p>
                    ) : null}
                    <ul className="mt-3 space-y-1.5">
                      {view.finalExam.requirements.map((requirement) => (
                        <li key={requirement.label} className="flex items-start gap-2 text-slate-700">
                          {requirement.met ? (
                            <Check className="mt-0.5 h-4 w-4 text-emerald-600" strokeWidth={3} />
                          ) : (
                            <Lock className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                    {view.finalExam.examId && view.finalExam.eligible ? (
                      <Link href={`/trainee/assessments/${view.finalExam.examId}`} className={`${traineeSecondaryCtaClass} mt-4`}>
                        Open quiz
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-slate-500">No final quiz for this course.</p>
                )}
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </TraineeShell>
  );
}

export default function TraineeProgressPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-slate-500">Loading your journey…</p>}>
      <ProgressClient />
    </Suspense>
  );
}
