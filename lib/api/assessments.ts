import { apiClient } from "@/lib/api/client";
import { trainerScopeQuery, type TrainerWorkScope } from "@/lib/api/scope";
import type {
  AssessmentAttemptView,
  AssessmentCatalog,
  AttemptGradeInput,
  GradingQueue,
  GradingQueueView,
  TrainerAssessmentDetail,
  TrainerAssessmentSummary,
} from "@/types/assessment";

export async function listTraineeAssessments(): Promise<{ assessments: AssessmentCatalog[] }> {
  return apiClient<{ assessments: AssessmentCatalog[] }>("/trainee/assessments");
}

export async function getTraineeAssessment(id: string): Promise<AssessmentCatalog> {
  return apiClient<AssessmentCatalog>(`/trainee/assessments/${id}`);
}

export async function startAssessmentAttempt(id: string): Promise<{ attempt: AssessmentAttemptView }> {
  return apiClient<{ attempt: AssessmentAttemptView }>(`/trainee/assessments/${id}/attempts`, {
    method: "POST",
  });
}

export async function getAssessmentAttempt(id: string): Promise<{ attempt: AssessmentAttemptView }> {
  return apiClient<{ attempt: AssessmentAttemptView }>(`/trainee/attempts/${id}`);
}

export async function submitAssessmentAttempt(
  id: string,
  answers: Array<{ questionId: string; optionIds: string[]; text?: string }>,
): Promise<{ attempt: AssessmentAttemptView }> {
  return apiClient<{ attempt: AssessmentAttemptView }>(`/trainee/attempts/${id}/submit`, {
    method: "POST",
    body: { answers },
  });
}

export async function gradeAssessmentAttempt(
  attemptId: string,
  grades: AttemptGradeInput[],
): Promise<{ attempt: { id: string; score: number | null; passed: boolean | null; needsReview: boolean } }> {
  return apiClient(`/trainer/attempts/${attemptId}/grade`, {
    method: "POST",
    body: { grades },
  });
}

export async function listTrainerAssessments(scope?: TrainerWorkScope): Promise<{ assessments: TrainerAssessmentSummary[] }> {
  return apiClient<{ assessments: TrainerAssessmentSummary[] }>(`/trainer/assessments${trainerScopeQuery(scope)}`);
}

export async function getGradingQueue(params: { view?: GradingQueueView; programId?: string } = {}): Promise<GradingQueue> {
  const query = new URLSearchParams();
  if (params.view) {
    query.set("view", params.view);
  }
  if (params.programId) {
    query.set("programId", params.programId);
  }
  const suffix = query.toString();
  return apiClient<GradingQueue>(`/trainer/grading-queue${suffix ? `?${suffix}` : ""}`);
}

export async function getGradingCount(): Promise<{ pending: number }> {
  return apiClient<{ pending: number }>("/trainer/grading-queue/count");
}

export const GRADING_CHANGED_EVENT = "lms:grading-changed";

export function notifyGradingChanged() {
  window.dispatchEvent(new Event(GRADING_CHANGED_EVENT));
}

export async function getTrainerAssessment(id: string, scope?: TrainerWorkScope): Promise<TrainerAssessmentDetail> {
  return apiClient(`/trainer/assessments/${id}${trainerScopeQuery(scope)}`);
}
