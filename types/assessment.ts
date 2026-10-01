import type { QuizKind } from "@/types/domain";
import type { QuestionType } from "@/types/program";

export type AccessStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PASSED"
  | "FAILED"
  | "PENDING_REVIEW";

export type AssessmentAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT";

export type SafeOption = {
  id: string;
  label: string;
  isCorrect?: boolean;
};

export type SafeQuestion = {
  id: string;
  type?: QuestionType;
  prompt: string;
  points: number;
  selectedOptionIds: string[];
  textAnswer?: string;
  isCorrect?: boolean;
  pointsAwarded?: number;
  trainerComment?: string;
  correctOptionIds?: string[];
  options: SafeOption[];
};

export type AttemptHistoryItem = {
  id: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score: number | null;
  passed: boolean | null;
  needsReview?: boolean;
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
    questionDrawCount: number | null;
    revealMode?: "HIDDEN" | "IMMEDIATE" | "SCHEDULED";
    revealAt?: string | null;
    answersVisible?: boolean;
    questionCount: number;
    questionBankCount: number;
    writtenQuestionCount?: number;
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
  pendingReview?: boolean;
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
  needsReview?: boolean;
  gradedAt?: string | null;
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
  questionDrawCount: number | null;
  questionCount: number;
  questionBankCount: number;
  writtenQuestionCount?: number;
  attemptCount: number;
  pendingReviewCount?: number;
  programId: string;
  programTitle?: string;
  location: string;
};

export type TrainerAssessmentQuestion = {
  id: string;
  type?: QuestionType;
  prompt: string;
  points: number;
  modelAnswer?: string;
  options: Array<{ id: string; label: string; isCorrect: boolean }>;
};

export type TrainerAssessmentAnswer = {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer?: string;
  isCorrect: boolean;
  pointsAwarded: number;
  needsReview?: boolean;
  trainerComment?: string;
};

export type TrainerAssessmentAttempt = {
  id: string;
  attemptNumber: number;
  status: string;
  score: number | null;
  passed: boolean | null;
  needsReview?: boolean;
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
    needsReview?: boolean;
    gradedAt?: string | null;
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
    needsReview?: boolean;
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
    needsReviewCount?: number;
    inProgressCount: number;
    notStartedCount: number;
    averageScore: number | null;
    passRate: number | null;
  };
  attempts: TrainerAssessmentAttempt[];
  roster: TrainerAssessmentRosterRow[];
};

export type AttemptGradeInput = {
  questionId: string;
  pointsAwarded: number;
  comment?: string;
};

export type GradingQueueView = "pending" | "graded";

export type GradingQueueItem = {
  attemptId: string;
  attemptNumber: number;
  status: AssessmentAttemptStatus;
  score: number | null;
  passed: boolean | null;
  needsReview: boolean;
  submittedAt: string | null;
  gradedAt: string | null;
  enrollmentId: string;
  pendingAnswerCount: number;
  writtenAnswerCount: number;
  trainee: { id: string; name: string; email: string; avatarUrl: string | null };
  batch: { id: string; name: string } | null;
  quiz: { id: string; title: string; kind: QuizKind; passingScore: number; location: string };
  programId: string;
  programTitle: string;
};

export type GradingQueue = {
  view: GradingQueueView;
  items: GradingQueueItem[];
  summary: { pending: number; gradedThisWeek: number; oldestPendingAt: string | null };
};
