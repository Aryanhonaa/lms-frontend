import type { CourseOutcomeView } from "@/types/learning";
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

export type TrainerProgramOption = {
  id: string;
  title: string;
};

export type TrainerTraineeRow = ProgramTraineeRow & {
  program: TrainerProgramOption;
};

export type ProgramTraineeRow = {
  enrollmentId: string;
  status: string;
  progress: number;
  courseOutcome: "PENDING" | "PASSED" | "FAILED";
  courseStatus: "IN_PROGRESS" | "FINISHED";
  failedAssessments: CourseOutcomeView["failedAssessments"];
  lastActivityAt: string | null;
  finishedAt: string | null;
  enrolledAt: string;
  enrolledBy: { id: string; name: string; email: string } | null;
  trainee: { id: string; name: string; email: string };
  batch: { id: string; name: string } | null;
};

export type TraineeRosterCounts = {
  total: number;
  inProgress: number;
  completed: number;
  failed: number;
  notStarted?: number;
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

export async function listProgramTrainees(
  programId: string,
): Promise<{ trainees: ProgramTraineeRow[]; counts: TraineeRosterCounts }> {
  return apiClient<{ trainees: ProgramTraineeRow[]; counts: TraineeRosterCounts }>(
    `/trainer/programs/${programId}/trainees`,
  );
}

export async function listTrainerTrainees(programId?: string): Promise<{
  programs: TrainerProgramOption[];
  trainees: TrainerTraineeRow[];
  counts: TraineeRosterCounts;
}> {
  const params = new URLSearchParams();
  if (programId) {
    params.set("programId", programId);
  }
  const query = params.toString();
  return apiClient<{
    programs: TrainerProgramOption[];
    trainees: TrainerTraineeRow[];
    counts: TraineeRosterCounts;
  }>(`/trainer/trainees${query ? `?${query}` : ""}`);
}

export async function getEnrollmentProgress(enrollmentId: string) {
  return apiClient<{
    enrollmentId: string;
    enrolledAt: string;
    trainee: { id: string; name: string; email: string };
    batch: { id: string; name: string } | null;
    progress: import("@/types/progress").ProgressView;
  }>(`/trainer/enrollments/${enrollmentId}/progress`);
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
