"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TraineeShell } from "@/components/trainee-shell";
import { CourseOutcomeBadge, CourseOutcomePanel } from "@/components/course-outcome";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { sequenceLabel } from "@/lib/batches/course-sequence";
import { preferredEnrollment } from "@/lib/learning/enrollment-priority";
import { traineePathHref } from "@/lib/learning/path";
import {
  courseListCategory,
  formatCourseDate,
  matchesCourseFilter,
  type CourseListFilter,
} from "@/lib/learning/course-outcome";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { EnrollmentSummary } from "@/types/learning";

const FILTERS: Array<{ id: CourseListFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Needs attention" },
];

function courseHref(row: EnrollmentSummary) {
  return traineePathHref(row.program.id, null, row.batch?.id);
}

function courseState(row: EnrollmentSummary, focusId?: string): "completed" | "current" | "upcoming" {
  if (row.course.outcome === "PASSED") {
    return "completed";
  }
  if (row.sequenceLocked) {
    return "upcoming";
  }
  if (focusId) {
    return row.program.id === focusId ? "current" : "upcoming";
  }
  if (row.course.outcome === "FAILED" || row.progress.percent > 0) {
    return "current";
  }
  return "upcoming";
}

function actionLabel(row: EnrollmentSummary, state: ReturnType<typeof courseState>) {
  if (row.sequenceLocked) {
    return "Locked";
  }
  if (row.course.outcome === "PASSED") {
    return "View course";
  }
  if (state === "upcoming") {
    return "View course";
  }
  if (row.progress.percent > 0) {
    return "Resume learning";
  }
  return "Continue learning";
}

function CourseCard({
  row,
  sequence,
  state,
}: {
  row: EnrollmentSummary;
  sequence: number;
  state: ReturnType<typeof courseState>;
}) {
  const finished = row.course.outcome !== "PENDING";
  const locked = Boolean(row.sequenceLocked);
  const date = formatCourseDate(row.course.finishedAt ?? row.course.lastActivityAt);
  const stateCopy = locked
    ? "Locked"
    : state === "completed"
      ? "Completed"
      : state === "current"
        ? "Available now"
        : "Up next";
  return (
    <article className={`${traineeCardClass} flex flex-col p-5 ${locked ? "opacity-95" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-violet-700 uppercase">
            {locked ? <Lock className="h-3 w-3 text-slate-400" aria-hidden /> : null}
            {sequenceLabel(sequence)} · {stateCopy}
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">{row.program.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {row.program.category}
            {row.batch?.name ? ` · ${row.batch.name}` : ""}
          </p>
        </div>
        <CourseOutcomeBadge course={row.course} progress={row.progress.percent} />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Progress</span>
          <span>{Math.round(row.progress.percent)}%</span>
        </div>
        <ProgressBar value={row.progress.percent} tone="violet" size="md" />
      </div>
      {row.course.outcome === "FAILED" ? (
        <div className="mt-3">
          <CourseOutcomePanel course={row.course} />
        </div>
      ) : null}
      {row.course.outcome === "PASSED" && date ? (
        <p className="mt-3 text-xs text-slate-500">Completed on {date}</p>
      ) : null}
      {!finished && date ? <p className="mt-3 text-xs text-slate-500">Last activity {date}</p> : null}
      {locked ? (
        <p className={`${traineeSecondaryCtaClass} mt-4 cursor-not-allowed opacity-70`}>
          {row.sequenceLockReason ?? "Finish the previous course first."}
        </p>
      ) : (
        <Link
          href={courseHref(row)}
          className={`${finished || state === "upcoming" ? traineeSecondaryCtaClass : traineePrimaryCtaClass} mt-4`}
        >
          {actionLabel(row, state)}
        </Link>
      )}
    </article>
  );
}

function groupByBatch(rows: EnrollmentSummary[]) {
  const groups = new Map<string, { name: string; rows: EnrollmentSummary[] }>();
  for (const row of rows) {
    const key = row.batch?.familyId ?? row.batch?.id ?? row.id;
    const name = row.batch?.name ?? "Your learning";
    const current = groups.get(key) ?? { name, rows: [] };
    current.rows.push(row);
    groups.set(key, current);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => (a.batch?.sortOrder ?? 0) - (b.batch?.sortOrder ?? 0)),
  }));
}

function CoursesClient() {
  const { user } = useAuth();
  const filters = useTraineeEnrollment();
  const [tab, setTab] = useState<CourseListFilter>("all");

  const grouped = useMemo(() => {
    const visible = filters.enrollments.filter((row) => row.course && matchesCourseFilter(row.course, tab));
    return groupByBatch(visible);
  }, [filters.enrollments, tab]);

  const counts = useMemo(() => {
    const rows = filters.enrollments;
    return {
      all: rows.length,
      "in-progress": rows.filter((row) => row.course && courseListCategory(row.course.outcome) === "in-progress").length,
      completed: rows.filter((row) => row.course && courseListCategory(row.course.outcome) === "completed").length,
      failed: rows.filter((row) => row.course && courseListCategory(row.course.outcome) === "failed").length,
    };
  }, [filters.enrollments]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="My learning" user={user}>
      <p className="mb-4 text-sm text-slate-500">Courses appear in the order your trainer set for each batch.</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setTab(filter.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === filter.id ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {filter.label}
            <span className="ml-1.5 text-xs opacity-80">{counts[filter.id]}</span>
          </button>
        ))}
      </div>
      {filters.error ? <ErrorState message={filters.error} /> : null}
      {!filters.ready && !filters.error ? <LoadingState /> : null}
      {filters.ready && filters.enrollments.length === 0 ? (
        <EmptyState title="Nothing assigned yet" description="When you join a batch, your courses show up here in order." />
      ) : null}
      {filters.ready && filters.enrollments.length > 0 && grouped.length === 0 ? (
        <EmptyState title={`No ${FILTERS.find((row) => row.id === tab)?.label.toLowerCase()} courses`} description="Try another filter." />
      ) : null}
      {grouped.map((group) => {
        const focus = preferredEnrollment(group.rows);
        return (
          <section key={group.name + group.rows[0]?.id} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">{group.name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {group.rows.map((row, index) => (
                <CourseCard
                  key={row.id}
                  row={row}
                  sequence={index}
                  state={courseState(row, focus?.program.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </TraineeShell>
  );
}

export default function TraineeCoursesPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-slate-500">Loading your courses…</p>}>
      <CoursesClient />
    </Suspense>
  );
}
