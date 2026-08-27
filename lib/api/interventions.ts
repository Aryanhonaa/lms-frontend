import { apiClient } from "@/lib/api/client";
import type {
  IndividualRequirement,
  IndividualRequirementType,
  InterventionFlag,
  InterventionStatus,
  TrainerEnrollment,
} from "@/types/intervention";

export async function listTrainerInterventions(status?: InterventionStatus): Promise<{ interventions: InterventionFlag[] }> {
  const query = status ? `?status=${status}` : "";
  return apiClient<{ interventions: InterventionFlag[] }>(`/trainer/interventions${query}`);
}

export async function updateTrainerIntervention(
  id: string,
  status: Exclude<InterventionStatus, "OPEN">,
): Promise<{ intervention: InterventionFlag }> {
  return apiClient<{ intervention: InterventionFlag }>(`/trainer/interventions/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function listTrainerEnrollments(): Promise<{ enrollments: TrainerEnrollment[] }> {
  return apiClient<{ enrollments: TrainerEnrollment[] }>("/trainer/enrollments");
}

export async function listTrainerRequirements(): Promise<{ requirements: IndividualRequirement[] }> {
  return apiClient<{ requirements: IndividualRequirement[] }>("/trainer/requirements");
}

export async function assignRequirement(body: {
  enrollmentId: string;
  interventionFlagId?: string | null;
  type: IndividualRequirementType;
  title: string;
  description?: string;
  trainerMessage?: string;
  reason?: string;
  deadline?: string | null;
}): Promise<{ requirement: IndividualRequirement }> {
  return apiClient<{ requirement: IndividualRequirement }>("/trainer/requirements", {
    method: "POST",
    body,
  });
}

export async function updateInterventionSettings(
  programId: string,
  body: { progressThreshold?: number; examScoreThreshold?: number },
): Promise<{ program: { id: string; progressThreshold: number; examScoreThreshold: number } }> {
  return apiClient(`/trainer/programs/${programId}/intervention-settings`, {
    method: "PATCH",
    body,
  });
}

export async function listTraineeRequirements(): Promise<{ requirements: IndividualRequirement[] }> {
  return apiClient<{ requirements: IndividualRequirement[] }>("/trainee/requirements");
}

export async function startTraineeRequirement(id: string): Promise<{ requirement: IndividualRequirement }> {
  return apiClient<{ requirement: IndividualRequirement }>(`/trainee/requirements/${id}/start`, { method: "POST" });
}

export async function completeTraineeRequirement(id: string): Promise<{ requirement: IndividualRequirement }> {
  return apiClient<{ requirement: IndividualRequirement }>(`/trainee/requirements/${id}/complete`, { method: "POST" });
}
