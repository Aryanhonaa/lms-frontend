import type { QuestionType } from "@/types/program";

export type QuizOptionDraft = { label: string; isCorrect: boolean };

export type QuizQuestionDraft = {
  type: QuestionType;
  prompt: string;
  points: number;
  modelAnswer: string;
  keepOptionOrder: boolean;
  options: QuizOptionDraft[];
};

export type QuizFormDraft = {
  updatedAt: number;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMin: string;
  maxAttempts: string;
  questionDrawCount: string;
  randomized: boolean;
  shuffleOptions: boolean;
  questions: QuizQuestionDraft[];
};

const PREFIX = "lms-quiz-draft:";

export function quizDraftStorageKey(programId: string, scope: string): string {
  return `${PREFIX}${programId}:${scope}`;
}

export function readQuizDraft(key: string): QuizFormDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as QuizFormDraft;
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeQuizDraft(key: string, draft: Omit<QuizFormDraft, "updatedAt">): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: QuizFormDraft = { ...draft, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function clearQuizDraft(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function quizDraftHasContent(draft: Omit<QuizFormDraft, "updatedAt">): boolean {
  if (draft.title.trim() || draft.description.trim()) {
    return true;
  }
  if (draft.timeLimitMin.trim() || draft.maxAttempts.trim() || draft.questionDrawCount.trim()) {
    return true;
  }
  if (draft.shuffleOptions) {
    return true;
  }
  if (draft.questions.length > 1) {
    return true;
  }
  return draft.questions.some((question) => {
    if (question.prompt.trim() || question.modelAnswer.trim()) {
      return true;
    }
    if (question.type === "WRITTEN") {
      return question.points !== 5;
    }
    if (question.points !== 1 || !question.keepOptionOrder) {
      return true;
    }
    return question.options.some((option, index) => option.label.trim() || (index > 0 && option.isCorrect) || (index === 0 && !option.isCorrect));
  });
}
