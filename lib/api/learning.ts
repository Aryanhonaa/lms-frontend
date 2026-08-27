import { apiClient } from "@/lib/api/client";
import type { EnrollmentSummary, LearnView, LearnableItemType } from "@/types/learning";

export async function listTraineeEnrollments(): Promise<{ enrollments: EnrollmentSummary[] }> {
  return apiClient<{ enrollments: EnrollmentSummary[] }>("/trainee/enrollments");
}

export async function getTraineeLearnView(programId: string, batchId?: string): Promise<LearnView> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<LearnView>(`/trainee/programs/${programId}/learn${query}`);
}

export async function completeTraineeItem(
  itemType: LearnableItemType,
  itemId: string,
  batchId?: string,
): Promise<LearnView> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<LearnView>(`/trainee/items/${itemType}/${itemId}/complete${query}`, {
    method: "POST",
  });
}
