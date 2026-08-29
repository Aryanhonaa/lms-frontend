import type { CourseOutcomeView } from "@/types/learning";
import {
  courseOutcomeLabel,
  courseOutcomeMark,
  courseOutcomeTone,
  failedAssessmentReason,
  formatCourseDate,
} from "@/lib/learning/course-outcome";

export function CourseOutcomeBadge({
  course,
  progress = 0,
}: {
  course: CourseOutcomeView;
  progress?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${courseOutcomeTone(course.outcome)}`}>
      <span aria-hidden>{courseOutcomeMark(course.outcome)}</span>
      {courseOutcomeLabel(course.outcome, progress)}
    </span>
  );
}

export function CourseOutcomePanel({ course, compact = false }: { course: CourseOutcomeView; compact?: boolean }) {
  if (course.outcome === "PENDING") {
    return null;
  }

  const failed = course.outcome === "FAILED";
  const date = formatCourseDate(course.finishedAt ?? course.lastActivityAt);

  return (
    <div className={failed ? "rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-900" : "rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-900"}>
      <p className="font-semibold">
        {courseOutcomeMark(course.outcome)} {failed ? "Failed" : "Completed"}
      </p>
      {failed ? <p className="mt-1 text-rose-800">{failedAssessmentReason(course.failedAssessments)}</p> : null}
      {date ? <p className={`mt-1 text-xs ${failed ? "text-rose-700" : "text-emerald-700"}`}>{failed ? "Finished" : "Completed on"} {date}</p> : null}
      {!compact && failed && course.failedAssessments.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-rose-800">
          {course.failedAssessments.map((row) => (
            <li key={row.id}>
              {row.title}: {row.score ?? 0}% / {row.passingScore}% · Attempts {row.attemptsUsed}
              {row.maxAttempts != null ? ` / ${row.maxAttempts}` : ""} · Did not pass
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
