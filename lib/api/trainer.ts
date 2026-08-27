import { apiClient } from "@/lib/api/client";
import type {
  DashboardRange,
  TrainerDashboardResponse,
  TrainerSearchResults,
} from "@/types/trainer-dashboard";

export async function getTrainerDashboard(range: DashboardRange = "week"): Promise<TrainerDashboardResponse> {
  return apiClient<TrainerDashboardResponse>(`/trainer/dashboard?range=${encodeURIComponent(range)}`);
}

export async function searchTrainerWorkspace(query: string): Promise<TrainerSearchResults> {
  return apiClient<TrainerSearchResults>(`/trainer/search?q=${encodeURIComponent(query)}`);
}
