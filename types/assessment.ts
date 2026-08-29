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
    questionDrawCount: number | null;
    questionCount: number;
    questionBankCount: number;
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
  attemptCount: number;
  programId: string;
  programTitle?: string;
  location: string;
};
