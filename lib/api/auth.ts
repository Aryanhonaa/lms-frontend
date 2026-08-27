import { apiClient, apiUpload } from "@/lib/api/client";
import type {
  AdminUsersResponse,
  AuthUser,
  LoginResponse,
  LogoutResponse,
  TraineeEnrollmentsResponse,
} from "@/types/api";

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function logout(): Promise<LogoutResponse> {
  return apiClient<LogoutResponse>("/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient<{ user: AuthUser }>("/auth/me");
}

export async function uploadProfilePicture(file: File): Promise<{ user: AuthUser }> {
  const body = new FormData();
  body.append("file", file);
  return apiUpload<{ user: AuthUser }>("/auth/avatar", body);
}

export async function getAdminUsers(): Promise<AdminUsersResponse> {
  return apiClient<AdminUsersResponse>("/admin/users");
}

export { listTrainerPrograms as getTrainerPrograms } from "@/lib/api/programs";
export async function getTraineeEnrollments(): Promise<TraineeEnrollmentsResponse> {
  return apiClient<TraineeEnrollmentsResponse>("/trainee/enrollments");
}
