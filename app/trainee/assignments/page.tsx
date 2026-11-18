"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, MessageSquareText, Sparkles } from "lucide-react";
import { TraineeShell } from "@/components/trainee-shell";
import { TraineeCourseFilters } from "@/components/trainee-course-filters";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { listTraineeAssignments } from "@/lib/api/assignments";
import { ApiClientError } from "@/lib/api/client";
import {
  enrollmentFamilyId,
  journeyOptionsFromEnrollments,
  preferredEnrollment,
} from "@/lib/learning/enrollment-priority";
import { friendlyLockReason } from "@/lib/learning/ux";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { AssignmentCatalog, AssignmentSubmissionStatus } from "@/types/assignment";
import type { EnrollmentSummary } from "@/types/learning";

type StatusFilter = "ALL" | "ACTION" | "WAITING" | "DONE";

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "ACTION", label: "Needs you" },
  { id: "WAITING", label: "With trainer" },
  { id: "DONE", label: "Graded" },
];

function assignmentKey(item: AssignmentCatalog): string {
  return `${item.assignment.id}:${item.assignment.batchId ?? ""}`;
}

function assignmentHref(item: AssignmentCatalog, review = false): string {
  const params = new URLSearchParams();
  if (item.assignment.batchId) {
    params.set("batchId", item.assignment.batchId);
  }
  if (review) {
    params.set("focus", "feedback");
  }
  const query = params.toString();
  return `/trainee/assignments/${item.assignment.id}${query ? `?${query}` : ""}`;
}

function hasTrainerFeedback(item: AssignmentCatalog): boolean {
  const status = item.submission.status;
  if (status === "GRADED" || status === "COMPLETED" || status === "CHANGES_REQUESTED") {
    return true;
  }
  return item.submission.score !== null || Boolean(item.submission.trainerComment?.trim());
}

function statusBucket(status: AssignmentSubmissionStatus): StatusFilter {
  if (status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "CHANGES_REQUESTED") {
    return "ACTION";
  }
  if (status === "SUBMITTED") {
    return "WAITING";
  }
  return "DONE";
}

function statusLabel(status: AssignmentSubmissionStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "Draft saved";
    case "SUBMITTED":
      return "Waiting for trainer";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "GRADED":
      return "Graded";
    case "COMPLETED":
      return "Completed";
  }
}

function actionLabel(item: AssignmentCatalog): string {
  if (item.assignment.status === "LOCKED") {
    return "Why it's locked";
  }
  switch (item.submission.status) {
    case "IN_PROGRESS":
      return "Continue";
    case "NOT_STARTED":
      return "Start";
    case "CHANGES_REQUESTED":
      return "Revise & resubmit";
    case "GRADED":
    case "COMPLETED":
      return "View feedback";
    default:
      return "Open";
  }
}

function matchesEnrollment(
  item: AssignmentCatalog,
  programId: string,
  batchId: string,
): boolean {
  if (programId && item.assignment.programId !== programId) {
    return false;
  }
  if (batchId && item.assignment.batchId && item.assignment.batchId !== batchId) {
    return false;
  }
  return true;
}

export default function TraineeAssignmentsPage() {
  const { user } = useAuth();
  const filters = useTraineeEnrollment({ preferAvailable: true });
  const [assignments, setAssignments] = useState<AssignmentCatalog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const journeys = useMemo(
    () => journeyOptionsFromEnrollments(filters.enrollments),
    [filters.enrollments],
  );
  const selectedEnrollment =
    filters.enrollments.find(
      (row) =>
        row.program.id === filters.programId &&
        (!filters.batchId || row.batch?.id === filters.batchId),
    ) ?? filters.selected;
  const journeyId = selectedEnrollment ? enrollmentFamilyId(selectedEnrollment) : "";
  const coursePrograms = useMemo(() => {
    if (!journeyId || journeys.length <= 1) {
      return filters.programs;
    }
    return filters.programs.filter((program) => {
      const row = filters.enrollments.find((item) => item.program.id === program.id);
      return row ? enrollmentFamilyId(row) === journeyId : false;
    });
  }, [filters.programs, filters.enrollments, journeyId, journeys.length]);

  function selectEnrollment(enrollment: EnrollmentSummary) {
    filters.setProgramId(enrollment.program.id);
    if (enrollment.batch?.id) {
      filters.setBatchId(enrollment.batch.id);
    }
  }

  useEffect(() => {
    listTraineeAssignments()
      .then((payload) => {
        setAssignments(payload.assignments);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load assignments");
      });
  }, []);

  const scoped = useMemo(() => {
    if (!assignments) {
      return [];
    }
    return assignments.filter((item) => matchesEnrollment(item, filters.programId, filters.batchId));
  }, [assignments, filters.programId, filters.batchId]);

  const feedbackReady = useMemo(() => {
    return [...scoped.filter(hasTrainerFeedback)].sort((left, right) => {
      const leftAt = left.submission.gradedAt ?? left.submission.submittedAt ?? "";
      const rightAt = right.submission.gradedAt ?? right.submission.submittedAt ?? "";
      return rightAt.localeCompare(leftAt);
    });
  }, [scoped]);

  const visible = useMemo(() => {
    if (statusFilter === "ALL") {
      return scoped;
    }
    return scoped.filter((item) => statusBucket(item.submission.status) === statusFilter);
  }, [scoped, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts = new Map<StatusFilter, number>();
    counts.set("ALL", scoped.length);
    for (const item of scoped) {
      const key = statusBucket(item.submission.status);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [scoped]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Assignments" user={user}>
      <div className="flex flex-col gap-5">
        {filters.ready ? (
          <section className={`${traineeCardClass} px-5 py-4`}>
            <p className="text-sm font-medium text-slate-900">Filter by course</p>
            <p className="mt-0.5 text-sm text-slate-500">Narrow assignments to one class and course.</p>
            <div className="mt-3">
              <TraineeCourseFilters
                programs={coursePrograms}
                batches={filters.batches}
                programId={filters.programId}
                batchId={filters.batchId}
                onProgramChange={(id) => {
                  const next =
                    filters.enrollments.find(
                      (row) => row.program.id === id && (!filters.batchId || row.batch?.id === filters.batchId),
                    ) ?? filters.enrollments.find((row) => row.program.id === id);
                  if (next) {
                    selectEnrollment(next);
                  }
                }}
                onBatchChange={filters.setBatchId}
                journeys={journeys}
                journeyId={journeyId}
                onJourneyChange={(nextJourneyId) => {
                  const rows = filters.enrollments.filter(
                    (row) => enrollmentFamilyId(row) === nextJourneyId,
                  );
                  const next = preferredEnrollment(rows) ?? rows[0];
                  if (next) {
                    selectEnrollment(next);
                  }
                }}
              />
            </div>
          </section>
        ) : null}

        {feedbackReady.length > 0 ? (
          <section className={`${traineeCardClass} overflow-hidden`}>
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm shadow-violet-600/20">
                  <MessageSquareText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Trainer feedback & grades</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {feedbackReady.length} assignment{feedbackReady.length === 1 ? "" : "s"} reviewed
                    {filters.selected ? ` in ${filters.selected.program.title}` : ""}. Open one to read the
                    score and comments from your trainer.
                  </p>
                </div>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {feedbackReady.map((item) => {
                const comment = item.submission.trainerComment?.trim();
                const changes = item.submission.status === "CHANGES_REQUESTED";
                return (
                  <li
                    key={`feedback-${assignmentKey(item)}`}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ContentTypeChip type="ASSIGNMENT" />
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            changes
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                          }`}
                        >
                          {changes ? "Needs revision" : "Feedback ready"}
                        </span>
                        {item.submission.score !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <Sparkles className="h-3 w-3" />
                            {item.submission.score}/{item.assignment.maxScore}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-semibold text-slate-900">{item.assignment.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.assignment.programTitle}
                        {item.assignment.batchName ? ` · ${item.assignment.batchName}` : ""}
                        {` · ${item.assignment.location}`}
                      </p>
                      {comment ? (
                        <p className="mt-2 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          “{comment}”
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          {item.submission.gradedBy
                            ? `Graded by ${item.submission.gradedBy.name}`
                            : "Score posted — open to see details."}
                        </p>
                      )}
                    </div>
                    <Link href={assignmentHref(item, true)} className={traineePrimaryCtaClass}>
                      View feedback
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className={`${traineeCardClass} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Your assignments</h2>
            <p className="mt-1 text-sm text-slate-500">
              Start drafts, submit work, or check what is waiting on your trainer.
            </p>
            {scoped.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((item) => {
                  const count = filterCounts.get(item.id) ?? 0;
                  if (item.id !== "ALL" && count === 0) {
                    return null;
                  }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        statusFilter === item.id
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      onClick={() => setStatusFilter(item.id)}
                    >
                      {item.label}
                      <span className={statusFilter === item.id ? "ml-1.5 text-white/80" : "ml-1.5 text-slate-400"}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="px-5 py-4">
              <ErrorState message={error} />
            </div>
          ) : null}
          {!assignments && !error ? (
            <div className="px-5">
              <LoadingState label="Loading assignments…" />
            </div>
          ) : null}
          {assignments && scoped.length === 0 && !error ? (
            <div className="px-5 py-6">
              <EmptyState
                title="No assignments for this course"
                description="Try another course or class, or check back as you move through the journey."
              />
            </div>
          ) : null}
          {scoped.length > 0 && visible.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState title="Nothing in this filter" description="Try All to see every assignment for this course." />
            </div>
          ) : null}

          {visible.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {visible.map((item) => {
                const locked = item.assignment.status === "LOCKED";
                const reviewed = hasTrainerFeedback(item);
                return (
                  <li
                    key={assignmentKey(item)}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ContentTypeChip type="ASSIGNMENT" />
                        {locked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        ) : null}
                        {reviewed && item.submission.score !== null ? (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            {item.submission.score}/{item.assignment.maxScore}
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-500">{item.assignment.location}</span>
                      </div>
                      <p className="mt-2 font-semibold text-slate-900">{item.assignment.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.assignment.dueDate
                          ? `Due ${new Date(item.assignment.dueDate).toLocaleDateString()}`
                          : "No due date"}
                        {` · ${item.assignment.maxScore} points`}
                        {item.assignment.batchName ? ` · ${item.assignment.batchName}` : ""}
                      </p>
                      {locked ? (
                        <p className="mt-1.5 text-sm text-slate-500">{friendlyLockReason(item.assignment.reason)}</p>
                      ) : (
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {statusLabel(item.submission.status)}
                          {item.submission.isLate ? " · submitted late" : ""}
                        </p>
                      )}
                    </div>
                    <Link
                      href={assignmentHref(item, reviewed)}
                      className={locked || item.submission.status === "SUBMITTED" ? traineeSecondaryCtaClass : traineePrimaryCtaClass}
                    >
                      {actionLabel(item)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>
    </TraineeShell>
  );
}
