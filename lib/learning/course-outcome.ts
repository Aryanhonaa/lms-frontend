import type { CourseOutcome, CourseOutcomeView, FailedAssessmentSummary } from "@/types/learning";

export type CourseListFilter = "all" | "in-progress" | "completed" | "failed";

export function courseListCategory(outcome: CourseOutcome): Exclude<CourseListFilter, "all"> {
  if (outcome === "PASSED") {
    return "completed";
  }
  if (outcome === "FAILED") {
    return "failed";
  }
  return "in-progress";
}

export function courseOutcomeLabel(outcome: CourseOutcome, progress = 0): string {
  if (outcome === "PASSED") {
    return "Completed";
  }
  if (outcome === "FAILED") {
    return "Failed";
  }
  if (progress <= 0) {
    return "Not started";
  }
  return "In Progress";
}

export function courseOutcomeTone(outcome: CourseOutcome): string {
  if (outcome === "PASSED") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (outcome === "FAILED") {
    return "bg-rose-50 text-rose-800";
  }
  return "bg-amber-50 text-amber-800";
}

export function courseOutcomeMark(outcome: CourseOutcome): string {
  if (outcome === "PASSED") {
    return "✓";
  }
  if (outcome === "FAILED") {
    return "✕";
  }
  return "●";
}

export function formatCourseDate(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function failedAssessmentReason(assessments: FailedAssessmentSummary[]): string {
  if (assessments.length === 0) {
    return "Required assessment was not passed.";
  }
  if (assessments.length === 1) {
    return `${assessments[0].title} was not passed.`;
  }
  return "Required assessments were not passed.";
}

export function matchesCourseFilter(course: CourseOutcomeView, filter: CourseListFilter): boolean {
  if (filter === "all") {
    return true;
  }
  return courseListCategory(course.outcome) === filter;
}
