"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { TraineeShell } from "@/components/trainee-shell";
import { CourseOutcomeBadge, CourseOutcomePanel } from "@/components/course-outcome";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
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
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
];

function courseHref(row: EnrollmentSummary) {
  return traineePathHref(row.program.id, null, row.batch?.id);
}

function CourseCard({ row }: { row: EnrollmentSummary }) {
  const finished = row.course.outcome !== "PENDING";
  const date = formatCourseDate(row.course.finishedAt ?? row.course.lastActivityAt);
  return (
    <article className={`${traineeCardClass} flex flex-col p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{row.program.title}</h2>
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
      <Link href={courseHref(row)} className={`${finished ? traineeSecondaryCtaClass : traineePrimaryCtaClass} mt-4`}>
        {finished ? "View Course" : "Continue Learning"}
      </Link>
    </article>
  );
}

function CoursesClient() {
  const { user } = useAuth();
  const filters = useTraineeEnrollment();
  const [tab, setTab] = useState<CourseListFilter>("all");

  const visible = useMemo(
    () => filters.enrollments.filter((row) => row.course && matchesCourseFilter(row.course, tab)),
    [filters.enrollments, tab],
  );

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
    <TraineeShell title="My Courses" user={user}>
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
        <EmptyState title="No courses yet" description="When you are enrolled, your courses will appear here." />
      ) : null}
      {filters.ready && filters.enrollments.length > 0 && visible.length === 0 ? (
        <EmptyState title={`No ${FILTERS.find((row) => row.id === tab)?.label.toLowerCase()} courses`} description="Try another filter." />
      ) : null}
      {visible.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((row) => (
            <CourseCard key={row.id} row={row} />
          ))}
        </div>
      ) : null}
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
