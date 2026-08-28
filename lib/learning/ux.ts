import type { AccessStatus, LearnPathType, LearnView } from "@/types/learning";
import type { PathItem } from "@/lib/learning/path";

export function isDoneStatus(status: AccessStatus): boolean {
  return status === "COMPLETED" || status === "PASSED";
}

export function isActionableStatus(status: AccessStatus): boolean {
  return status === "AVAILABLE" || status === "IN_PROGRESS" || status === "FAILED";
}

export function statusCopy(status: AccessStatus): { label: string; className: string } {
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
    return { label: "Retry", className: "bg-amber-50 text-amber-800" };
  }
  return { label: "Up next", className: "bg-sky-50 text-sky-700" };
}

export function progressHeadline(completed: number, total: number, percent: number): string {
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
  if (kind?.includes("EXAM")) {
    return "Exam";
  }
  if (type === "QUIZ" || kind?.includes("QUIZ")) {
    return "Quiz";
  }
  return "Lesson";
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

export function flattenLearnPath(view: LearnView): PathItem[] {
  const items: PathItem[] = [];
  for (const week of view.weeks) {
    for (const day of week.days) {
      for (const item of day.items) {
        items.push({
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
          items.push({
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
        items.push({
          type: "QUIZ",
          kind: quiz.kind,
          id: quiz.id,
          title: quiz.title,
          status: quiz.status,
          reason: quiz.reason,
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
        items.push({
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
      items.push({
        type: "QUIZ",
        kind: quiz.kind,
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        reason: quiz.reason,
        weekTitle: week.title,
        dayTitle: null,
      });
    }
  }
  if (view.finalExam) {
    items.push({
      type: "QUIZ",
      kind: "FINAL_EXAM",
      id: view.finalExam.id,
      title: view.finalExam.title,
      status: view.finalExam.status,
      reason: view.finalExam.reason,
      weekTitle: "Final stretch",
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
  return path.find((item) => isActionableStatus(item.status)) ?? null;
}

export function currentDayItems(view: LearnView, path: PathItem[]): PathItem[] {
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
