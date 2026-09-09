import { apiClient } from "@/lib/api/client";
import type {
  CourseRef,
  PersonRef,
  TrackerAudit,
  TrackerBatchSummary,
  TrackerDashboard,
  TrackerTniCase,
  TrackerTrainee,
} from "@/types/training-tracker";

const root = "/training-tracker";

export function processLabel(process: string): string {
  return process === "VOICE_SALES" ? "Voice / Sales" : "Non-Voice / Sales Support";
}

export function percentLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export async function getTrackerOptions(): Promise<{
  trainers: PersonRef[];
  trainees: PersonRef[];
  courses: CourseRef[];
}> {
  return apiClient(`${root}/options`);
}

export async function getTrackerDashboard(): Promise<TrackerDashboard> {
  return apiClient(`${root}/dashboard`);
}

export async function listTrackerBatches(query = ""): Promise<{ batches: TrackerBatchSummary[] }> {
  return apiClient(`${root}/batches${query}`);
}

export async function getTrackerBatch(id: string): Promise<{ batch: TrackerBatchSummary; trainees: TrackerTrainee[] }> {
  return apiClient(`${root}/batches/${id}`);
}

export async function createTrackerBatch(input: Record<string, unknown>): Promise<{ batch: TrackerBatchSummary }> {
  return apiClient(`${root}/batches`, { method: "POST", body: input });
}

export async function updateTrackerBatch(id: string, input: Record<string, unknown>): Promise<{ batch: TrackerBatchSummary }> {
  return apiClient(`${root}/batches/${id}`, { method: "PATCH", body: input });
}

export async function addTrackerTrainee(batchId: string, input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/batches/${batchId}/trainees`, { method: "POST", body: input });
}

export async function addStandaloneTrackerTrainee(input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/trainees`, { method: "POST", body: input });
}

export async function listTrackerTrainees(query = ""): Promise<{ trainees: TrackerTrainee[] }> {
  return apiClient(`${root}/trainees${query}`);
}

export async function recordTrackerAttrition(id: string, input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/trainees/${id}/attrition`, { method: "POST", body: input });
}

export async function recordTrackerExam(id: string, input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/trainees/${id}/exam`, { method: "POST", body: input });
}

export async function recordTrackerHandover(id: string, input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/trainees/${id}/handover`, { method: "POST", body: input });
}

export async function listTrackerAudits(): Promise<{ audits: TrackerAudit[] }> {
  return apiClient(`${root}/audits`);
}

export async function createTrackerAudit(input: Record<string, unknown>): Promise<{ trainee: TrackerTrainee }> {
  return apiClient(`${root}/audits`, { method: "POST", body: input });
}

export async function listTrackerTni(): Promise<{ cases: TrackerTniCase[] }> {
  return apiClient(`${root}/tni`);
}

export async function updateTrackerTniSupport(id: string, input: Record<string, unknown>): Promise<{ cases: TrackerTniCase[] }> {
  return apiClient(`${root}/tni/${id}/support`, { method: "PATCH", body: input });
}

export async function decideTrackerTni(id: string, input: Record<string, unknown>): Promise<{ cases: TrackerTniCase[] }> {
  return apiClient(`${root}/tni/${id}/decision`, { method: "POST", body: input });
}
