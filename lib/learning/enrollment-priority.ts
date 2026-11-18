import type { EnrollmentSummary } from "@/types/learning";

export type TraineeCourseOption = {
  id: string;
  title: string;
  locked: boolean;
  lockReason: string | null;
  available: boolean;
  outcome: EnrollmentSummary["course"]["outcome"];
  batchId?: string;
};

export type TraineeJourneyOption = {
  id: string;
  name: string;
  courseCount: number;
  completedCount: number;
  availableCourseTitle: string | null;
};

export function enrollmentFamilyId(row: EnrollmentSummary): string {
  return row.batch?.familyId ?? row.batch?.id ?? row.id;
}

export function sortByCourseOrder(rows: EnrollmentSummary[]): EnrollmentSummary[] {
  return [...rows].sort((left, right) => (left.batch?.sortOrder ?? 0) - (right.batch?.sortOrder ?? 0));
}

export function familyEnrollments(enrollments: EnrollmentSummary[], row: EnrollmentSummary | null): EnrollmentSummary[] {
  if (!row) {
    return [];
  }
  const familyId = row.batch?.familyId ?? row.batch?.id;
  if (!familyId) {
    return [row];
  }
  return sortByCourseOrder(
    enrollments.filter((item) => (item.batch?.familyId ?? item.batch?.id) === familyId),
  );
}

export function journeyOptionsFromEnrollments(enrollments: EnrollmentSummary[]): TraineeJourneyOption[] {
  const families = new Map<string, EnrollmentSummary[]>();
  for (const row of enrollments) {
    const id = enrollmentFamilyId(row);
    families.set(id, [...(families.get(id) ?? []), row]);
  }
  return [...families.entries()].map(([id, rows]) => {
    const ordered = sortByCourseOrder(rows);
    const root = ordered.find((row) => row.batch?.id === id) ?? ordered[0];
    const available = preferredEnrollment(ordered);
    return {
      id,
      name: root?.batch?.name ?? "Your learning journey",
      courseCount: ordered.length,
      completedCount: ordered.filter((row) => row.course.outcome === "PASSED").length,
      availableCourseTitle:
        available && !available.sequenceLocked && available.course.outcome === "PENDING"
          ? available.program.title
          : null,
    };
  });
}

/** First course the trainee should focus on: unlocked + in progress, else first unlocked pending, else first unlocked. */
export function preferredEnrollment(
  enrollments: EnrollmentSummary[],
  prefer?: { programId?: string; batchId?: string },
): EnrollmentSummary | null {
  if (enrollments.length === 0) {
    return null;
  }

  if (prefer?.programId) {
    const exact =
      enrollments.find(
        (row) =>
          row.program.id === prefer.programId && (!prefer.batchId || row.batch?.id === prefer.batchId),
      ) ?? enrollments.find((row) => row.program.id === prefer.programId);
    if (exact && !exact.sequenceLocked) {
      return exact;
    }
  }

  const unlocked = enrollments.filter((row) => !row.sequenceLocked);
  const inProgress = unlocked.find(
    (row) => row.course.outcome === "PENDING" && row.progress.percent > 0,
  );
  if (inProgress) {
    return inProgress;
  }
  const ready = unlocked.find((row) => row.course.outcome === "PENDING");
  if (ready) {
    return ready;
  }
  if (unlocked[0]) {
    return unlocked[0];
  }
  return enrollments[0] ?? null;
}

export function courseOptionsFromEnrollments(enrollments: EnrollmentSummary[]): TraineeCourseOption[] {
  const seen = new Map<string, TraineeCourseOption>();
  for (const row of sortByCourseOrder(enrollments)) {
    if (seen.has(row.program.id)) {
      continue;
    }
    const locked = Boolean(row.sequenceLocked);
    seen.set(row.program.id, {
      id: row.program.id,
      title: row.program.title,
      locked,
      lockReason: row.sequenceLockReason ?? null,
      available: !locked && row.course.outcome === "PENDING",
      outcome: row.course.outcome,
      batchId: row.batch?.id,
    });
  }
  // Unlocked / available courses first so the picker defaults to what the trainee can do.
  return [...seen.values()].sort((left, right) => {
    if (left.locked !== right.locked) {
      return left.locked ? 1 : -1;
    }
    if (left.available !== right.available) {
      return left.available ? -1 : 1;
    }
    return 0;
  });
}
