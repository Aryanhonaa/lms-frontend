import { apiClient } from "@/lib/api/client";
import type {
  AdminDashboardResponse,
  AdminDirectoryUser,
  OperationsDashboardResponse,
} from "@/types/admin";
import type { CalendarEvent } from "@/types/calendar";
import type { ProgressView } from "@/types/progress";

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  return apiClient<AdminDashboardResponse>("/admin/dashboard");
}

export async function listAdminCalendar(): Promise<{ events: CalendarEvent[] }> {
  return apiClient<{ events: CalendarEvent[] }>("/admin/calendar");
}

export async function getOperationsDashboard(): Promise<OperationsDashboardResponse> {
  return apiClient<OperationsDashboardResponse>("/admin/operations");
}

export async function listAdminTrainers(): Promise<{ trainers: AdminDirectoryUser[] }> {
  return apiClient<{ trainers: AdminDirectoryUser[] }>("/admin/trainers");
}

export async function listAdminTrainees(): Promise<{ trainees: AdminDirectoryUser[] }> {
  return apiClient<{ trainees: AdminDirectoryUser[] }>("/admin/trainees");
}

export type AdminTraineeProgram = {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  enrolledBy: { id: string; name: string; email: string } | null;
  progress: ProgressView;
};

export async function getAdminTrainee(userId: string): Promise<{
  trainee: AdminDirectoryUser;
  programs: AdminTraineeProgram[];
}> {
  return apiClient(`/admin/trainees/${userId}`);
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  role: "ADMIN" | "TRAINER" | "TRAINEE";
  password: string;
}): Promise<{ user: AdminDirectoryUser }> {
  return apiClient<{ user: AdminDirectoryUser }>("/admin/users", {
    method: "POST",
    body: input,
  });
}

export async function deleteAdminUser(userId: string): Promise<{ deleted: true }> {
  return apiClient<{ deleted: true }>(`/admin/users/${userId}`, { method: "DELETE" });
}
