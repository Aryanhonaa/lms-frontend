import { apiClient } from "@/lib/api/client";
import type { ProgressListItem, ProgressView } from "@/types/progress";

export async function listTraineeProgress(): Promise<{ enrollments: ProgressListItem[] }> {
  return apiClient<{ enrollments: ProgressListItem[] }>("/trainee/progress");
}

export async function getTraineeProgress(programId: string, batchId?: string): Promise<ProgressView> {
  const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : "";
  return apiClient<ProgressView>(`/trainee/programs/${programId}/progress${query}`);
}
