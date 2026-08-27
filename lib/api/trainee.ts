import { apiClient } from "@/lib/api/client";
import type { DashboardRange } from "@/types/trainer-dashboard";
import type { TraineeDashboardResponse, TraineeSearchResults } from "@/types/trainee-dashboard";

export async function getTraineeDashboard(range: DashboardRange = "week"): Promise<TraineeDashboardResponse> {
  return apiClient<TraineeDashboardResponse>(`/trainee/dashboard?range=${encodeURIComponent(range)}`);
}

export async function searchTraineeWorkspace(query: string): Promise<TraineeSearchResults> {
  return apiClient<TraineeSearchResults>(`/trainee/search?q=${encodeURIComponent(query)}`);
}
