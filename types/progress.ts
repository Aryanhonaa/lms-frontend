import type { ProgressStatus } from "@/types/learning";

export type TrackedKind =
  | "LESSON"
  | "VIDEO"
  | "RESOURCE"
  | "REEL"
  | "ASSIGNMENT"
  | "PRACTICE_QUIZ"
  | "WEEKLY_QUIZ"
  | "WEEKLY_EXAM"
  | "MILESTONE_EXAM"
  | "FINAL_EXAM";

export type ProgressActivity = {
  kind: TrackedKind;
  id: string;
  title: string;
  weekTitle: string;
  dayTitle: string | null;
};

export type RequirementStatus = {
  id: string;
  kind: string;
  label: string;
  targetCount: number;
  complete: boolean;
  blocking: boolean;
  display: "Complete" | "Missing";
};

export type MilestoneProgress = {
  id: string;
  title: string;
  afterWeekIndex: number;
  sortOrder: number;
  satisfied: boolean;
  status: ProgressStatus;
  reason: string | null;
  requirements: RequirementStatus[];
  exam: {
    id: string;
    title: string;
    status: ProgressStatus;
    reason: string | null;
    available: boolean;
  } | null;
};

export type FinalExamEligibility = {
  configured: boolean;
  examId: string | null;
  title: string | null;
  eligible: boolean;
  status: ProgressStatus;
  reason: string | null;
  reasons: string[];
  requirements: Array<{ label: string; met: boolean }>;
};

export type ProgressView = {
  enrollment: {
    id: string;
    status: string;
    overallProgress: number;
    currentWeekIndex: number;
    currentDayIndex: number;
  };
  program: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    durationWeeks: number;
    trainingMode: string;
    status: string;
  };
  overall: {
    percent: number;
    completedWeight: number;
    totalWeight: number;
    completedItems: number;
    remainingItems: number;
  };
  currentWeek: { id: string; title: string; sortOrder: number; status: ProgressStatus } | null;
  currentDay: { id: string; title: string; sortOrder: number; status: ProgressStatus } | null;
  currentActivity: ProgressActivity | null;
  nextActivity: ProgressActivity | null;
  weekProgress: Array<{
    id: string;
    sortOrder: number;
    title: string;
    status: ProgressStatus;
    reason: string | null;
    percent: number;
    gatingComplete: boolean;
  }>;
  items: Array<{
    kind: TrackedKind;
    id: string;
    title: string;
    status: ProgressStatus;
    reason: string | null;
    available: boolean;
    weight: number;
    earnedWeight: number;
    score: number | null;
    completedAt: string | null;
    weekTitle: string;
    dayTitle: string | null;
  }>;
  milestones: MilestoneProgress[];
  currentMilestone: { id: string; title: string } | null;
  finalExam: FinalExamEligibility;
};

export type ProgressListItem = {
  id: string;
  status: string;
  overallProgress: number;
  program: ProgressView["program"];
  batch?: { id: string; name: string } | null;
  overall?: ProgressView["overall"];
  currentWeek: ProgressView["currentWeek"];
  currentActivity: ProgressActivity | null;
  nextActivity: ProgressActivity | null;
  currentMilestone: { id: string; title: string } | null;
};
