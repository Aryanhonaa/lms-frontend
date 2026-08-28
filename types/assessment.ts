import type { QuizKind } from "@/types/domain";

export type AccessStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "PASSED" | "FAILED";

export type AssessmentAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT";

export type SafeOption = {
  id: string;
  label: string;
  isCorrect?: boolean;
};

export type SafeQuestion = {
  id: string;
  prompt: string;
  points: number;
  selectedOptionIds: string[];
  isCorrect?: boolean;
  pointsAwarded?: number;
  correctOptionIds?: string[];
  options: SafeOption[];
};

export type AttemptHistoryItem = {
  id: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
  deadlineAt: string | null;
};

export type AssessmentCatalog = {
  assessment: {
    id: string;
    kind: QuizKind;
    title: string;
    description: string;
    passingScore: number;
    timeLimitMin: number | null;
    maxAttempts: number | null;
    randomized: boolean;
    revealMode?: "HIDDEN" | "IMMEDIATE" | "SCHEDULED";
    revealAt?: string | null;
    answersVisible?: boolean;
    questionCount: number;
    programId: string;
    programTitle: string;
    location: string;
    status: AccessStatus;
    reason: string | null;
  };
  attempts: AttemptHistoryItem[];
  attemptsUsed: number;
  attemptsRemaining: number | null;
  bestScore: number | null;
  passed: boolean;
  activeAttemptId: string | null;
  canStart: boolean;
};

export type AssessmentAttemptView = {
  id: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  score: number | null;
  passed: boolean | null;
  passingScore: number;
  answersVisible?: boolean;
  questions: SafeQuestion[];
};

export type TrainerAssessmentSummary = {
  id: string;
  kind: QuizKind;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMin: number | null;
  maxAttempts: number | null;
  randomized: boolean;
  questionCount: number;
  attemptCount: number;
  programId: string;
  programTitle?: string;
  location: string;
};

export type TrainerAssessmentQuestion = {
  id: string;
  prompt: string;
  points: number;
  options: Array<{ id: string; label: string; isCorrect: boolean }>;
};

export type TrainerAssessmentAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
};

export type TrainerAssessmentAttempt = {
  id: string;
  attemptNumber: number;
  status: string;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
  enrollmentId?: string;
  trainee: { id: string; name: string; email: string };
  batch?: { id: string; name: string };
  answers?: TrainerAssessmentAnswer[];
};

export type TrainerAssessmentRosterRow = {
  enrollmentId: string;
  trainee: { id: string; name: string; email: string };
  traineeId: string;
  batch: { id: string; name: string } | null;
  status: string;
  latest: {
    id: string;
    attemptNumber: number;
    status: string;
    score: number | null;
    passed: boolean | null;
    startedAt: string;
    submittedAt: string | null;
    answers: TrainerAssessmentAnswer[];
  } | null;
  attempts: Array<{
    id: string;
    attemptNumber: number;
    status: string;
    score: number | null;
    passed: boolean | null;
    startedAt: string;
    submittedAt: string | null;
  }>;
};

export type TrainerAssessmentDetail = {
  assessment: TrainerAssessmentSummary & {
    revealMode?: "HIDDEN" | "IMMEDIATE" | "SCHEDULED";
    revealAt?: string | null;
    questions: TrainerAssessmentQuestion[];
  };
  summary: {
    rosterCount: number;
    submittedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    averageScore: number | null;
    passRate: number | null;
  };
  attempts: TrainerAssessmentAttempt[];
  roster: TrainerAssessmentRosterRow[];
};
