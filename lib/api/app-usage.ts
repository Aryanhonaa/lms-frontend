import { apiClient } from "@/lib/api/client";
import type { AppUsageAnalyticsResponse, AppUsageConfig, AppUsagePeriod } from "@/types/app-usage";

export type AppUsageQuery = {
  period: AppUsagePeriod;
  date: string;
  programId?: string;
  batchId?: string;
  traineeId?: string;
  traineeIds?: string[];
};

function buildQuery(input: AppUsageQuery): string {
  const params = new URLSearchParams();
  params.set("period", input.period);
  params.set("date", input.date);
  if (input.programId) {
    params.set("programId", input.programId);
  }
  if (input.batchId) {
    params.set("batchId", input.batchId);
  }
  if (input.traineeId) {
    params.set("traineeId", input.traineeId);
  }
  if (input.traineeIds && input.traineeIds.length > 0) {
    params.set("traineeIds", input.traineeIds.join(","));
  }
  return params.toString();
}

export async function getAdminAppUsage(query: AppUsageQuery): Promise<AppUsageAnalyticsResponse> {
  return apiClient(`/admin/analytics/app-usage?${buildQuery(query)}`);
}

export async function getTrainerAppUsage(query: AppUsageQuery): Promise<AppUsageAnalyticsResponse> {
  return apiClient(`/trainer/analytics/app-usage?${buildQuery(query)}`);
}

export async function getUsageConfig(): Promise<{ config: AppUsageConfig }> {
  return apiClient("/trainee/usage/config");
}

export async function sendUsageHeartbeat(input: { programId?: string; batchId?: string } = {}): Promise<void> {
  await apiClient("/trainee/usage/heartbeat", { method: "POST", body: input });
}

export async function endUsageSession(): Promise<void> {
  await apiClient("/trainee/usage/end", { method: "POST" });
}
