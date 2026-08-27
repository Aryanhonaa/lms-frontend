import { apiClient } from "@/lib/api/client";

export type EligibleTrainee = {
  id: string;
  name: string;
  email: string;
  enrolled: boolean;
};

export type EligibleTraineesResponse = {
  canEnroll: boolean;
  programStatus: string;
  total: number;
  trainees: EligibleTrainee[];
};

export type ProgramTraineeRow = {
  enrollmentId: string;
  status: string;
  progress: number;
  enrolledAt: string;
  enrolledBy: { id: string; name: string; email: string } | null;
  trainee: { id: string; name: string; email: string };
  batch: { id: string; name: string } | null;
};

export type EnrollResult = {
  enrolled: Array<{ userId: string; name: string }>;
  alreadyEnrolled: Array<{ userId: string; name: string }>;
  skipped: Array<{ userId: string; reason: string }>;
  enrolledCount: number;
  alreadyEnrolledCount: number;
  skippedCount: number;
};

export async function listEligibleTrainees(
  programId: string,
  query = "",
  batchId?: string,
): Promise<EligibleTraineesResponse> {
  const params = new URLSearchParams({ take: "40" });
  if (query.trim()) {
    params.set("q", query.trim());
  }
  if (batchId) {
    params.set("batchId", batchId);
  }
  return apiClient<EligibleTraineesResponse>(
    `/trainer/programs/${programId}/eligible-trainees?${params.toString()}`,
  );
}

export async function listProgramTrainees(programId: string): Promise<{ trainees: ProgramTraineeRow[] }> {
  return apiClient<{ trainees: ProgramTraineeRow[] }>(`/trainer/programs/${programId}/trainees`);
}

export async function enrollTrainees(
  programId: string,
  traineeIds: string[],
  batchId: string,
): Promise<EnrollResult> {
  return apiClient<EnrollResult>(`/trainer/programs/${programId}/enrollments`, {
    method: "POST",
    body: { traineeIds, batchId },
  });
}
