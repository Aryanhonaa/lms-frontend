import type { Role } from "./domain";

export type MaterialType = "PROGRAM" | "VIDEO" | "DOCUMENT" | "LINK";

export type AdminDashboardMetrics = {
  courses: { total: number; addedThisMonth: number };
  trainees: { total: number; addedThisMonth: number };
  trainers: { total: number; pending: number };
  pendingApprovals: { total: number };
};

export type PendingApprovalRow = {
  id: string;
  title: string;
  course: string;
  trainerName: string;
  type: MaterialType;
  uploadedAt: string;
};

export type ActivityItem = {
  id: string;
  actorName: string;
  message: string;
  occurredAt: string;
};

export type AdminDashboard = {
  metrics: AdminDashboardMetrics;
  pendingApprovals: PendingApprovalRow[];
  recentActivity: ActivityItem[];
};

export type AdminDashboardResponse = {
  dashboard: AdminDashboard;
};

export type OperationsMetrics = {
  totalPrograms: number;
  activePrograms: number;
  pendingApprovals: number;
  trainers: number;
  trainees: number;
  activeEnrollments: number;
  completedPrograms: number;
  traineesRequiringAttention: number;
};

export type OperationsPendingRow = {
  id: string;
  title: string;
  trainerName: string;
  submittedAt: string;
  status: string;
};

export type TraineeOverviewStats = {
  activeTrainees: number;
  currentlyLearning: number;
  completedTrainees: number;
  requiringAttention: number;
};

export type OperationsDashboard = {
  metrics: OperationsMetrics;
  pendingApprovals: OperationsPendingRow[];
  traineeOverview: TraineeOverviewStats;
  recentActivity: ActivityItem[];
};

export type OperationsDashboardResponse = {
  dashboard: OperationsDashboard;
};

export type AdminDirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollmentCount?: number;
};
