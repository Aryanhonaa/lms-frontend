import { apiClient } from "@/lib/api/client";
import { trainerScopeQuery, type TrainerWorkScope } from "@/lib/api/scope";
import type { AssessmentAttemptView, AssessmentCatalog, TrainerAssessmentDetail, TrainerAssessmentSummary } from "@/types/assessment";

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
  answers: Array<{ questionId: string; optionIds: string[] }>,
): Promise<{ attempt: AssessmentAttemptView }> {
  return apiClient<{ attempt: AssessmentAttemptView }>(`/trainee/attempts/${id}/submit`, {
    method: "POST",
    body: { answers },
  });
}

export async function listTrainerAssessments(scope?: TrainerWorkScope): Promise<{ assessments: TrainerAssessmentSummary[] }> {
  return apiClient<{ assessments: TrainerAssessmentSummary[] }>(`/trainer/assessments${trainerScopeQuery(scope)}`);
}

export async function getTrainerAssessment(id: string, scope?: TrainerWorkScope): Promise<TrainerAssessmentDetail> {
  return apiClient(`/trainer/assessments/${id}${trainerScopeQuery(scope)}`);
}
