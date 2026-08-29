export type AccessStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "PASSED" | "FAILED";
export type ProgressStatus = AccessStatus;
export type CourseOutcome = "PENDING" | "PASSED" | "FAILED";
export type CourseRunStatus = "IN_PROGRESS" | "FINISHED";

export type FailedAssessmentSummary = {
  id: string;
  title: string;
  kind: string;
  score: number | null;
  passingScore: number;
  attemptsUsed: number;
  maxAttempts: number | null;
};

export type CourseOutcomeView = {
  outcome: CourseOutcome;
  courseStatus: CourseRunStatus;
  failedAssessments: FailedAssessmentSummary[];
  lastActivityAt?: string | null;
  finishedAt?: string | null;
};
export type LearnableItemType = "LESSON" | "VIDEO" | "RESOURCE" | "REEL";
export type LearnPathType = LearnableItemType | "QUIZ" | "ASSIGNMENT";

import type { AttachmentView, StoredFileMeta } from "@/types/files";

export type LearnAssignment = {
  id: string;
  title: string;
  status: AccessStatus;
  reason: string | null;
  dueDate: string | null;
  maxScore: number;
  description?: string;
  linkedItemType?: string | null;
  linkedItemId?: string | null;
  attachments?: AttachmentView[];
};

export type LearnQuiz = {
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
};

export type LearnItem = {
  type: LearnableItemType;
  id: string;
  title: string;
  status: AccessStatus;
  reason: string | null;
  required: boolean;
  durationMin?: number;
  durationSec?: number;
  kind?: string;
  source?: string;
  description?: string;
  url?: string;
  /** Present when the file lives in LMS storage and needs an authorized access URL. */
  file?: StoredFileMeta;
  attachments?: AttachmentView[];
};

export type LearnDay = {
  id: string;
  sortOrder: number;
  title: string;
  status: AccessStatus;
  reason: string | null;
  items: LearnItem[];
  quizzes?: LearnQuiz[];
  assignments?: LearnAssignment[];
};

export type LearnWeek = {
  id: string;
  sortOrder: number;
  title: string;
  status: AccessStatus;
  reason: string | null;
  days: LearnDay[];
  quizzes?: LearnQuiz[];
};

export type LearnMilestone = {
  id: string;
  title: string;
  afterWeekIndex: number;
  exam: LearnQuiz | null;
};

export type NextActivity = {
  type: LearnPathType;
  kind?: string;
  id: string;
  title: string;
  weekTitle: string;
  dayTitle: string | null;
} | null;

export type LearnView = {
  enrollment: {
    id: string;
    status: string;
    overallProgress: number;
    currentWeekIndex: number;
    currentDayIndex: number;
  };
  batch?: { id: string; name: string } | null;
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
  currentWeek: { id: string; title: string; sortOrder: number; status: AccessStatus } | null;
  currentDay: { id: string; title: string; sortOrder: number; status: AccessStatus } | null;
  nextActivity: NextActivity;
  course: CourseOutcomeView;
  progress: {
    completedRequired: number;
    totalRequired: number;
    percent: number;
    completedWeight?: number;
    totalWeight?: number;
    completedItems?: number;
    remainingItems?: number;
  };
  weeks: LearnWeek[];
  milestones?: LearnMilestone[];
  finalExam?: LearnQuiz | null;
};

export type EnrollmentSummary = {
  id: string;
  status: string;
  overallProgress: number;
  currentWeekIndex: number;
  currentDayIndex: number;
  program: LearnView["program"];
  batch?: { id: string; name: string } | null;
  currentWeek: LearnView["currentWeek"];
  currentDay: LearnView["currentDay"];
  nextActivity: NextActivity;
  course: CourseOutcomeView;
  progress: LearnView["progress"];
};
