export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorBody = {
  message: string;
  code: string;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type HealthStatus = {
  status: "ok";
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "TRAINER" | "TRAINEE";
  avatarUrl?: string | null;
  createdAt: string;
};

export type LoginResponse = {
  user: AuthUser;
};

export type LogoutResponse = {
  loggedOut: true;
};

export type AdminUsersResponse = {
  users: Array<AuthUser & { isActive: boolean; updatedAt: string }>;
};

export type TrainerProgramsResponse = {
  programs: Array<{
    id: string;
    title: string;
    status: string;
    category?: string;
    difficulty?: string;
    durationWeeks?: number;
    trainingMode?: string;
    rejectionReason?: string | null;
    updatedAt?: string;
    _count?: { weeks: number };
  }>;
};

export type TraineeEnrollmentsResponse = {
  enrollments: Array<{
    id: string;
    programId: string;
    status: string;
  }>;
};
