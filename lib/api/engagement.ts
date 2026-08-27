import { apiClient } from "@/lib/api/client";
import type {
  AchievementItem,
  AnnouncementAudience,
  AnnouncementItem,
  FeedbackItem,
  FeedbackModerationStatus,
  FeedbackOptions,
  FeedbackTargetKind,
  LeaderboardBoard,
  NotificationInbox,
} from "@/types/engagement";

export async function getTraineeLeaderboard(programId?: string, batchId?: string): Promise<{ boards: LeaderboardBoard[] }> {
  const params = new URLSearchParams();
  if (programId) {
    params.set("programId", programId);
  }
  if (batchId) {
    params.set("batchId", batchId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient(`/trainee/leaderboard${query}`);
}

export async function getTrainerLeaderboard(programId?: string, batchId?: string): Promise<{ boards: LeaderboardBoard[] }> {
  const params = new URLSearchParams();
  if (programId) {
    params.set("programId", programId);
  }
  if (batchId) {
    params.set("batchId", batchId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient(`/trainer/leaderboard${query}`);
}

export async function getAdminLeaderboard(programId?: string, batchId?: string): Promise<{ boards: LeaderboardBoard[] }> {
  const params = new URLSearchParams();
  if (programId) {
    params.set("programId", programId);
  }
  if (batchId) {
    params.set("batchId", batchId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient(`/admin/leaderboard${query}`);
}

export async function listTraineeAchievements(): Promise<{ achievements: AchievementItem[] }> {
  return apiClient("/trainee/achievements");
}

export async function getFeedbackOptions(): Promise<FeedbackOptions> {
  return apiClient("/trainee/feedback/options");
}

export async function listTraineeFeedback(): Promise<{ feedback: FeedbackItem[] }> {
  return apiClient("/trainee/feedback");
}

export async function submitFeedback(input: {
  targetKind: FeedbackTargetKind;
  targetId: string;
  enrollmentId?: string;
  batchId?: string;
  rating: number;
  comment?: string;
}): Promise<{ feedback: FeedbackItem }> {
  return apiClient("/trainee/feedback", { method: "POST", body: input });
}

export async function listTrainerFeedback(programId?: string): Promise<{ feedback: FeedbackItem[] }> {
  const query = programId ? `?programId=${encodeURIComponent(programId)}` : "";
  return apiClient(`/trainer/feedback${query}`);
}

export async function listAdminFeedback(status?: FeedbackModerationStatus): Promise<{ feedback: FeedbackItem[] }> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient(`/admin/feedback${query}`);
}

export async function moderateFeedback(
  id: string,
  status: FeedbackModerationStatus,
): Promise<{ feedback: FeedbackItem }> {
  return apiClient(`/admin/feedback/${id}`, { method: "PATCH", body: { status } });
}

export async function listAnnouncements(role: "trainee" | "trainer" | "admin"): Promise<{ announcements: AnnouncementItem[] }> {
  return apiClient(`/${role}/announcements`);
}

export async function getNotificationInbox(role: "trainee" | "trainer"): Promise<NotificationInbox> {
  return apiClient(`/${role}/notifications`);
}

export async function markNotificationsRead(role: "trainee" | "trainer", ids?: string[]): Promise<NotificationInbox> {
  return apiClient(`/${role}/notifications/read`, { method: "POST", body: ids ? { ids } : {} });
}

export async function createAnnouncement(
  role: "trainer" | "admin",
  input: {
    title: string;
    body: string;
    audience: AnnouncementAudience;
    programId?: string | null;
    batchId?: string | null;
    traineeIds?: string[];
  },
): Promise<{ announcement: AnnouncementItem }> {
  return apiClient(`/${role}/announcements`, { method: "POST", body: input });
}
