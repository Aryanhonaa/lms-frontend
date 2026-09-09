import { apiClient } from "@/lib/api/client";
import type { EnrollResult, ProgramTraineeRow } from "@/lib/api/enrollments";

export type ProgramBatch = {
  id: string;
  programId: string;
  name: string;
  description: string;
  capacity: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  memberCount: number;
  remaining: number;
};

export type ProgramBatchesResponse = {
  batches: ProgramBatch[];
};

export async function listProgramBatches(
  programId: string,
  role: "trainer" | "admin" = "trainer",
): Promise<ProgramBatchesResponse> {
  return apiClient(`/${role}/programs/${programId}/batches`);
}

export async function createProgramBatch(
  programId: string,
  input: { name: string; description?: string; capacity?: number; startDate?: string; endDate?: string },
): Promise<{ batch: ProgramBatch }> {
  return apiClient(`/trainer/programs/${programId}/batches`, { method: "POST", body: input });
}

/** Hidden roster used by course enrollments. Trainers should not create these from the UI. */
export async function ensureCourseEnrollmentRoster(
  programId: string,
  programTitle: string,
): Promise<ProgramBatch> {
  const existing = await listProgramBatches(programId);
  const withSeats = existing.batches.find((batch) => batch.remaining > 0) ?? existing.batches[0];
  if (withSeats) {
    return withSeats;
  }
  const created = await createProgramBatch(programId, {
    name: programTitle.trim() || "Course roster",
    capacity: 500,
  });
  return created.batch;
}

export async function updateProgramBatch(
  batchId: string,
  input: { name?: string; description?: string; capacity?: number },
): Promise<{ batch: ProgramBatch }> {
  return apiClient(`/trainer/batches/${batchId}`, { method: "PATCH", body: input });
}

export async function deleteProgramBatch(batchId: string): Promise<{ deleted: boolean }> {
  return apiClient(`/trainer/batches/${batchId}`, { method: "DELETE" });
}

export async function listBatchTrainees(
  batchId: string,
  role: "trainer" | "admin" = "trainer",
): Promise<{ batch: ProgramBatch; trainees: ProgramTraineeRow[] }> {
  return apiClient(`/${role}/batches/${batchId}/trainees`);
}

export async function enrollIntoBatch(batchId: string, traineeIds: string[]): Promise<EnrollResult> {
  return apiClient(`/trainer/batches/${batchId}/enrollments`, { method: "POST", body: { traineeIds } });
}
