import type { AccessStatus, LearnPathType, NextActivity } from "@/types/learning";

function withScope(programId: string, batchId?: string | null, extra?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  params.set("programId", programId);
  if (batchId) {
    params.set("batchId", batchId);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  return params.toString();
}

export function traineePathHref(
  programId: string,
  item?: { type: string; id: string } | null,
  batchId?: string | null,
): string {
  return `/trainee/learn?${withScope(programId, batchId, item ? { type: item.type, id: item.id } : undefined)}`;
}

export function traineeWorkHref(
  programId: string,
  item: { type: string; id: string },
  batchId?: string | null,
): string {
  const scope = withScope(programId, batchId, { from: "learn" });
  if (item.type === "ASSIGNMENT") {
    return `/trainee/assignments/${item.id}?${scope}`;
  }
  if (item.type === "QUIZ") {
    return `/trainee/assessments/${item.id}?${scope}`;
  }
  return traineePathHref(programId, item, batchId);
}

/** Open the next step the way a trainee expects: quizzes/assignments go to the work page. */
export function traineeContinueHref(
  programId: string,
  item: { type: string; id: string; status?: AccessStatus } | null | undefined,
  batchId?: string | null,
): string {
  if (!item) {
    return traineePathHref(programId, null, batchId);
  }
  if (item.status === "LOCKED") {
    return traineePathHref(programId, item, batchId);
  }
  return traineeWorkHref(programId, item, batchId);
}

export function learnReturnHref(programId: string | null | undefined, batchId?: string | null): string {
  if (!programId) {
    return "/trainee/learn";
  }
  return `/trainee/learn?${withScope(programId, batchId)}`;
}

export function pathItemLabel(type: string, kind?: string | null): string {
  if (type === "ASSIGNMENT") {
    return "Assignment";
  }
  if (kind?.includes("EXAM")) {
    return "Exam";
  }
  if (type === "QUIZ" || kind?.includes("QUIZ")) {
    return "Quiz";
  }
  if (type === "LESSON") {
    return "Lesson";
  }
  if (type === "VIDEO") {
    return "Video";
  }
  if (type === "REEL") {
    return "Reel";
  }
  if (type === "RESOURCE") {
    return "Reading";
  }
  return type;
}

export function isLearnPathType(value: string | null | undefined): value is LearnPathType {
  return (
    value === "LESSON" ||
    value === "VIDEO" ||
    value === "RESOURCE" ||
    value === "REEL" ||
    value === "QUIZ" ||
    value === "ASSIGNMENT"
  );
}

export type PathItem = {
  type: LearnPathType;
  kind?: string;
  id: string;
  title: string;
  status: AccessStatus;
  reason: string | null;
  weekTitle: string;
  dayTitle: string | null;
  required?: boolean;
  dueDate?: string | null;
  maxScore?: number;
  description?: string;
  linkedItemType?: string | null;
  linkedItemId?: string | null;
};

export function nextPathItem(items: PathItem[], current: PathItem | null): PathItem | NextActivity | null {
  const actionable = (item: PathItem) =>
    item.status === "AVAILABLE" || item.status === "IN_PROGRESS" || item.status === "FAILED";
  if (!current) {
    return items.find(actionable) ?? null;
  }
  const index = items.findIndex((item) => item.id === current.id && item.type === current.type);
  const rest = index === -1 ? items : items.slice(index + 1);
  return rest.find(actionable) ?? rest.find((item) => item.status !== "LOCKED") ?? null;
}
