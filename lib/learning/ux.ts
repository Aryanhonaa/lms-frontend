import type { AccessStatus, LearnPathType, LearnView } from "@/types/learning";
import type { PathItem } from "@/lib/learning/path";

export function isDoneStatus(status: AccessStatus): boolean {
  return status === "COMPLETED" || status === "PASSED";
}

export function isActionableStatus(status: AccessStatus, canRetry = false): boolean {
  return status === "AVAILABLE" || status === "IN_PROGRESS" || (status === "FAILED" && canRetry);
}

export function statusCopy(status: AccessStatus, canRetry = false): { label: string; className: string } {
  if (status === "LOCKED") {
    return { label: "Locked", className: "bg-slate-100 text-slate-600" };
  }
  if (status === "COMPLETED" || status === "PASSED") {
    return { label: "Done", className: "bg-emerald-50 text-emerald-700" };
  }
  if (status === "IN_PROGRESS") {
    return { label: "In progress", className: "bg-violet-50 text-violet-700" };
  }
  if (status === "FAILED") {
    if (canRetry) {
      return { label: "Retry", className: "bg-amber-50 text-amber-800" };
    }
    return { label: "Did not pass", className: "bg-rose-50 text-rose-800" };
  }
  return { label: "Up next", className: "bg-sky-50 text-sky-700" };
}

export function progressHeadline(
  completed: number,
  total: number,
  percent: number,
  outcome?: "PENDING" | "PASSED" | "FAILED",
): string {
  if (outcome === "FAILED") {
    return "Course not passed";
  }
  if (outcome === "PASSED") {
    return "Course completed";
  }
  if (total <= 0) {
    return "Ready when you are";
  }
  if (percent >= 100 || (total > 0 && completed >= total)) {
    return "Journey complete";
  }
  if (percent >= 85 || total - completed === 1) {
    return "Almost there";
  }
  return `${completed} of ${total} completed`;
}

export function locationLabel(weekTitle: string, dayTitle?: string | null): string {
  return dayTitle ? `${weekTitle} · ${dayTitle}` : weekTitle;
}

export function contentTypeLabel(type: string, kind?: string | null): string {
  if (type === "ASSIGNMENT" || kind === "ASSIGNMENT") {
    return "Assignment";
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
  if (kind === "FINAL_EXAM") {
    return "Final Exam";
  }
  if (kind === "MILESTONE_EXAM") {
    return "Milestone Exam";
  }
  if (kind === "WEEKLY_EXAM") {
    return "Weekly exam";
  }
  if (type === "QUIZ" || kind?.includes("QUIZ") || kind?.includes("EXAM")) {
    return "Quiz";
  }
  return "Lesson";
}

export function assessmentHierarchy(kind?: string | null): "final" | "milestone" | "quiz" | null {
  if (kind === "FINAL_EXAM") {
    return "final";
  }
  if (kind === "MILESTONE_EXAM") {
    return "milestone";
  }
  if (kind?.includes("QUIZ") || kind?.includes("EXAM")) {
    return "quiz";
  }
  return null;
}

export function pathItemStatusCopy(
  item: { type: string; kind?: string | null; status: AccessStatus; canRetry?: boolean },
  isCurrent = false,
): { label: string; className: string } {
  const quiz = item.type === "QUIZ" || Boolean(item.kind?.includes("QUIZ") || item.kind?.includes("EXAM"));
  if (item.status === "LOCKED") {
    return { label: "Locked", className: "bg-slate-100 text-slate-600" };
  }
  if (item.status === "PASSED") {
    return { label: "Passed", className: "bg-emerald-50 text-emerald-700" };
  }
  if (item.status === "COMPLETED") {
    return { label: "Completed", className: "bg-emerald-50 text-emerald-700" };
  }
  if (item.status === "IN_PROGRESS") {
    return { label: "In progress", className: "bg-violet-50 text-violet-700" };
  }
  if (item.status === "FAILED") {
    if (item.canRetry) {
      return { label: "Not passed · Retry available", className: "bg-amber-50 text-amber-800" };
    }
    return { label: "Not passed · Attempts exhausted", className: "bg-rose-50 text-rose-800" };
  }
  if (isCurrent) {
    return { label: "Current", className: "bg-violet-50 text-violet-700" };
  }
  if (quiz) {
    return { label: "Ready to take", className: "bg-sky-50 text-sky-700" };
  }
  return { label: "Not started", className: "bg-slate-50 text-slate-600" };
}

export function quizAttemptLine(item: {
  score?: number | null;
  passingScore?: number | null;
  attemptsUsed?: number;
  maxAttempts?: number | null;
}): string | null {
  const parts: string[] = [];
  if (item.score != null && item.passingScore != null) {
    parts.push(`${item.score}% / ${item.passingScore}%`);
  } else if (item.passingScore != null) {
    parts.push(`${item.passingScore}% required`);
  }
  if (item.attemptsUsed != null && item.maxAttempts != null) {
    parts.push(`Attempts ${item.attemptsUsed} / ${item.maxAttempts}`);
  } else if (item.attemptsUsed != null && item.attemptsUsed > 0) {
    parts.push(`Attempts ${item.attemptsUsed}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function quizActionLabel(item: { kind?: string | null; status: AccessStatus; canRetry?: boolean }): string {
  const exam = Boolean(item.kind?.includes("EXAM"));
  if (isDoneStatus(item.status)) {
    return "View score";
  }
  if (item.status === "IN_PROGRESS") {
    return exam ? "Continue exam" : "Continue quiz";
  }
  if (item.status === "FAILED" && item.canRetry) {
    return exam ? "Retry exam" : "Retry quiz";
  }
  if (item.status === "FAILED") {
    return "View score";
  }
  return exam ? "Start exam" : "Start quiz";
}

export function continueActionLabel(item: { type: string; kind?: string | null }): string {
  if (item.type === "ASSIGNMENT") {
    return "Continue to assignment";
  }
  if (item.kind?.includes("EXAM")) {
    return "Continue to exam";
  }
  if (item.type === "QUIZ" || item.kind?.includes("QUIZ")) {
    return "Continue to quiz";
  }
  return "Continue";
}

export function learnTypeFromKind(kind: string): LearnPathType {
  if (kind === "ASSIGNMENT") {
    return "ASSIGNMENT";
  }
  if (kind === "LESSON" || kind === "VIDEO" || kind === "REEL" || kind === "RESOURCE") {
    return kind;
  }
  return "QUIZ";
}

export function friendlyLockReason(reason: string | null): string {
  if (!reason) {
    return "Finish the previous step to unlock this.";
  }

  const weekOpen = reason.match(/This week opens on (.+)\./i);
  if (weekOpen) {
    return `This opens on ${weekOpen[1]}.`;
  }

  const completeBefore = reason.match(/Complete (.+) before accessing this content\./i);
  if (completeBefore) {
    return `Finish ${completeBefore[1]} to unlock this.`;
  }

  if (/required lessons before the quiz/i.test(reason)) {
    return "Finish today's lessons to unlock this quiz.";
  }
  if (/required lessons before the assignment/i.test(reason)) {
    return "Finish today's lessons to unlock this assignment.";
  }
  if (/Finish this file before the assignment/i.test(reason)) {
    return "Finish this file to unlock its assignment.";
  }
  if (/Finish the previous file and its assignment first/i.test(reason)) {
    return "Finish the previous file and its assignment first.";
  }
  if (/Pass this day's quiz before the assignment/i.test(reason)) {
    return "Pass today's quiz to unlock this assignment.";
  }
  if (/You did not pass the previous quiz, but you have used all available attempts/i.test(reason)) {
    return reason;
  }
  if (/lessons and practice quizzes first/i.test(reason)) {
    return "Finish this chapter's lessons and quizzes first.";
  }

  const milestone = reason.match(/Complete (.+) before this milestone exam\./i);
  if (milestone) {
    return `Finish ${milestone[1]} to unlock this quiz.`;
  }

  if (/Missing requirement:/i.test(reason)) {
    return reason.replace(/Missing requirement:\s*/i, "Still needed: ").replace(/\bprogram\b/gi, "course");
  }

  return reason.replace(/\bprogram\b/gi, "course").replace(/\bbatch\b/gi, "class").replace(/\bcurriculum\b/gi, "journey");
}

export function isQuizProgressionLock(reason: string | null): boolean {
  if (!reason) {
    return false;
  }
  return /pass (this day'?s |today'?s |the )?quiz/i.test(reason) || /pass the quiz to continue/i.test(reason);
}

export function exhaustedQuizContinueCopy(): string {
  return "You did not pass the previous quiz, but you have used all available attempts. You can continue with the course.";
}

export function lockCopyForItem(item: PathItem, path: PathItem[]): string {
  if (item.status !== "LOCKED") {
    return friendlyLockReason(item.reason);
  }
  if (isQuizProgressionLock(item.reason)) {
    const related = path.find(
      (row) =>
        row.type === "QUIZ" &&
        row.weekTitle === item.weekTitle &&
        row.dayTitle === item.dayTitle &&
        row.status === "FAILED" &&
        !row.canRetry,
    );
    if (related) {
      return exhaustedQuizContinueCopy();
    }
  }
  return friendlyLockReason(item.reason);
}

function quizPathFields(quiz: {
  id: string;
  title: string;
  kind: string;
  status: AccessStatus;
  reason: string | null;
  canRetry?: boolean;
  score?: number | null;
  passingScore?: number | null;
  attemptsUsed?: number;
  maxAttempts?: number | null;
}) {
  return {
    type: "QUIZ" as const,
    kind: quiz.kind,
    id: quiz.id,
    title: quiz.title,
    status: quiz.status,
    reason: quiz.reason,
    canRetry: quiz.canRetry,
    score: quiz.score,
    passingScore: quiz.passingScore,
    attemptsUsed: quiz.attemptsUsed,
    maxAttempts: quiz.maxAttempts,
  };
}

export function flattenLearnPath(view: LearnView): PathItem[] {
  const items: PathItem[] = [];
  const seen = new Set<string>();
  function push(item: PathItem) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    items.push(item);
  }

  for (const week of view.weeks) {
    for (const day of week.days) {
      for (const item of day.items) {
        push({
          type: item.type,
          id: item.id,
          title: item.title,
          status: item.status,
          reason: item.reason,
          weekTitle: week.title,
          dayTitle: day.title,
          required: item.required,
          description: item.description,
        });
        for (const assignment of day.assignments ?? []) {
          if (assignment.linkedItemId !== item.id || assignment.linkedItemType !== item.type) {
            continue;
          }
          push({
            type: "ASSIGNMENT",
            id: assignment.id,
            title: assignment.title,
            status: assignment.status,
            reason: assignment.reason,
            weekTitle: week.title,
            dayTitle: day.title,
            dueDate: assignment.dueDate,
            maxScore: assignment.maxScore,
            description: assignment.description,
            linkedItemType: assignment.linkedItemType,
            linkedItemId: assignment.linkedItemId,
          });
        }
      }
      for (const quiz of day.quizzes ?? []) {
        if (quiz.kind === "FINAL_EXAM") {
          continue;
        }
        push({
          ...quizPathFields(quiz),
          weekTitle: week.title,
          dayTitle: day.title,
        });
      }
      for (const assignment of day.assignments ?? []) {
        if (assignment.linkedItemId && assignment.linkedItemType) {
          const parent = day.items.find(
            (item) => item.id === assignment.linkedItemId && item.type === assignment.linkedItemType,
          );
          if (parent) {
            continue;
          }
        }
        push({
          type: "ASSIGNMENT",
          id: assignment.id,
          title: assignment.title,
          status: assignment.status,
          reason: assignment.reason,
          weekTitle: week.title,
          dayTitle: day.title,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore,
          description: assignment.description,
          linkedItemType: assignment.linkedItemType,
          linkedItemId: assignment.linkedItemId,
        });
      }
    }
    for (const quiz of week.quizzes ?? []) {
      if (quiz.kind === "FINAL_EXAM") {
        continue;
      }
      push({
        ...quizPathFields(quiz),
        weekTitle: week.title,
        dayTitle: null,
      });
    }
    for (const milestone of view.milestones ?? []) {
      if (milestone.afterWeekIndex !== week.sortOrder || !milestone.exam) {
        continue;
      }
      push({
        ...quizPathFields(milestone.exam),
        weekTitle: week.title,
        dayTitle: null,
      });
    }
  }
  if (view.finalExam) {
    push({
      ...quizPathFields({ ...view.finalExam, kind: view.finalExam.kind || "FINAL_EXAM" }),
      weekTitle: view.weeks[view.weeks.length - 1]?.title ?? "Final assessment",
      dayTitle: null,
    });
  }
  return items;
}

export function nextUnlockItem(path: PathItem[], current: PathItem | null): PathItem | null {
  const index = current ? path.findIndex((item) => item.id === current.id && item.type === current.type) : -1;
  const rest = index === -1 ? path : path.slice(index + 1);
  return rest.find((item) => item.status === "LOCKED") ?? null;
}

export function doThisFirst(path: PathItem[]): PathItem | null {
  return path.find((item) => isActionableStatus(item.status, item.canRetry)) ?? null;
}

export function currentDayItems(view: LearnView, path: PathItem[], current: PathItem | null): PathItem[] {
  if (current) {
    const aroundCurrent = path.filter(
      (item) => item.weekTitle === current.weekTitle && item.dayTitle === current.dayTitle,
    );
    if (aroundCurrent.length > 0) {
      return aroundCurrent;
    }
  }
  if (view.currentDay && view.currentWeek) {
    const dayItems = path.filter(
      (item) => item.weekTitle === view.currentWeek?.title && item.dayTitle === view.currentDay?.title,
    );
    if (dayItems.length > 0) {
      return dayItems;
    }
  }
  const next = view.nextActivity;
  if (next) {
    const around = path.filter((item) => item.weekTitle === next.weekTitle && item.dayTitle === next.dayTitle);
    if (around.length > 0) {
      return around;
    }
  }
  return path.slice(0, 4);
}
