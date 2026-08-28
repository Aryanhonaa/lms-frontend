import { apiClient } from "@/lib/api/client";
import type { ProgramStatus } from "@/types/domain";
import type { CreateProgramInput, ProgramSummary, ProgramTree, QuizInput } from "@/types/program";

type ProgramPayload = { program: ProgramTree };
type ProgramListPayload = { programs: ProgramSummary[] };

export async function listTrainerPrograms(): Promise<ProgramListPayload> {
  return apiClient<ProgramListPayload>("/trainer/programs");
}

export async function listAdminPrograms(status?: ProgramStatus): Promise<ProgramListPayload> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient<ProgramListPayload>(`/admin/programs${query}`);
}

export async function listAdminCatalog(): Promise<ProgramListPayload> {
  return apiClient<ProgramListPayload>("/admin/programs?view=all");
}

export async function getTrainerProgram(programId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/programs/${programId}`);
}

export async function getAdminProgram(programId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/admin/programs/${programId}`);
}

export async function createProgram(input: CreateProgramInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>("/trainer/programs", { method: "POST", body: input });
}

export async function updateProgram(
  programId: string,
  input: Partial<CreateProgramInput>,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/programs/${programId}`, { method: "PATCH", body: input });
}

export async function deleteTrainerProgram(programId: string): Promise<{ deleted: true }> {
  return apiClient<{ deleted: true }>(`/trainer/programs/${programId}`, { method: "DELETE" });
}

export async function deleteAdminProgram(programId: string): Promise<{ deleted: true }> {
  return apiClient<{ deleted: true }>(`/admin/programs/${programId}`, { method: "DELETE" });
}

export async function submitProgram(programId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/programs/${programId}/submit`, { method: "POST" });
}

export async function approveProgram(programId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/programs/${programId}/approve`, { method: "POST" });
}

export async function rejectProgram(programId: string, reason: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/programs/${programId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export async function addWeek(programId: string, body: { title: string; description?: string }): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/programs/${programId}/weeks`, { method: "POST", body });
}

export async function updateWeek(
  weekId: string,
  body: Partial<{ title: string; description: string; objectives: string[] }>,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}`, { method: "PATCH", body });
}

export async function deleteWeek(weekId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}`, { method: "DELETE" });
}

export async function addDay(weekId: string, body: { title: string }): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}/days`, { method: "POST", body });
}

export async function updateDay(dayId: string, body: { title: string }): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}`, { method: "PATCH", body });
}

export async function deleteDay(dayId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}`, { method: "DELETE" });
}

export async function addLesson(
  dayId: string,
  body: { title: string; description?: string; durationMin?: number },
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/lessons`, { method: "POST", body });
}

export async function updateLesson(
  lessonId: string,
  body: Partial<{ title: string; description: string; durationMin: number }>,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/lessons/${lessonId}`, { method: "PATCH", body });
}

export async function deleteLesson(lessonId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/lessons/${lessonId}`, { method: "DELETE" });
}

export type StoredFileInput = {
  fileKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export async function addVideo(
  dayId: string,
  body: { title: string; source: "YOUTUBE" | "UPLOADED" | "EXTERNAL"; url?: string; durationMin?: number } & StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/videos`, { method: "POST", body });
}

export async function updateVideo(
  videoId: string,
  body: Partial<{ title: string; source: "YOUTUBE" | "UPLOADED" | "EXTERNAL"; url: string; durationMin: number }> &
    StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/videos/${videoId}`, { method: "PATCH", body });
}

export async function deleteVideo(videoId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/videos/${videoId}`, { method: "DELETE" });
}

export async function addResource(
  dayId: string,
  body: {
    title: string;
    url?: string;
    kind: "DOCUMENT" | "ARTICLE" | "GITHUB" | "YOUTUBE" | "WEBSITE" | "TUTORIAL";
    description?: string;
  } & StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/resources`, { method: "POST", body });
}

export async function updateResource(
  resourceId: string,
  body: Partial<{
    title: string;
    url: string;
    kind: "DOCUMENT" | "ARTICLE" | "GITHUB" | "YOUTUBE" | "WEBSITE" | "TUTORIAL";
    description: string;
  }> &
    StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/resources/${resourceId}`, { method: "PATCH", body });
}

export async function deleteResource(resourceId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/resources/${resourceId}`, { method: "DELETE" });
}

export async function addReel(
  dayId: string,
  body: { title: string; url?: string; durationSec?: number } & StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/reels`, { method: "POST", body });
}

export async function updateReel(
  reelId: string,
  body: Partial<{ title: string; url: string; durationSec: number }> & StoredFileInput,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/reels/${reelId}`, { method: "PATCH", body });
}

export async function deleteReel(reelId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/reels/${reelId}`, { method: "DELETE" });
}

export async function addAssignment(
  dayId: string,
  body: {
    title: string;
    description?: string;
    instructions?: string;
    dueDate?: string | null;
    maxScore?: number;
    allowFileUpload?: boolean;
    allowTextResponse?: boolean;
    allowLateSubmission?: boolean;
    allowResubmission?: boolean;
    maxAttempts?: number;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    status?: "DRAFT" | "PUBLISHED" | "CLOSED";
    linkedItemType?: "LESSON" | "VIDEO" | "RESOURCE" | "REEL" | null;
    linkedItemId?: string | null;
  },
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/assignments`, { method: "POST", body });
}

export async function updateAssignment(
  assignmentId: string,
  body: Partial<{
    title: string;
    description: string;
    maxScore: number;
    linkedItemType: "LESSON" | "VIDEO" | "RESOURCE" | "REEL" | null;
    linkedItemId: string | null;
  }>,
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/assignments/${assignmentId}`, { method: "PATCH", body });
}

export async function deleteAssignment(assignmentId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/assignments/${assignmentId}`, { method: "DELETE" });
}

export async function addPracticeQuiz(dayId: string, body: QuizInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/days/${dayId}/practice-quiz`, { method: "POST", body });
}

export async function addWeeklyQuiz(weekId: string, body: QuizInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}/weekly-quiz`, { method: "POST", body });
}

export async function addWeeklyExam(weekId: string, body: QuizInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}/weekly-exam`, { method: "POST", body });
}

export async function addFinalExam(programId: string, body: QuizInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/programs/${programId}/final-exam`, { method: "POST", body });
}

export async function addMilestoneExam(milestoneId: string, body: QuizInput): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/milestones/${milestoneId}/exam`, { method: "POST", body });
}

export async function deleteQuiz(quizId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/quizzes/${quizId}`, { method: "DELETE" });
}

export async function addMilestone(
  programId: string,
  body: { title: string; afterWeekIndex: number },
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/programs/${programId}/milestones`, { method: "POST", body });
}

export async function deleteMilestone(milestoneId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/milestones/${milestoneId}`, { method: "DELETE" });
}

export async function addRequirement(
  milestoneId: string,
  body: {
    label: string;
    kind?: "WEEKS_COMPLETED" | "ASSESSMENTS_PASSED" | "ASSIGNMENTS_COMPLETE" | "ATTENDANCE" | "CUSTOM";
    targetCount?: number;
  },
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/milestones/${milestoneId}/requirements`, {
    method: "POST",
    body,
  });
}

export async function deleteRequirement(requirementId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/requirements/${requirementId}`, { method: "DELETE" });
}

export async function addSession(
  weekId: string,
  body: {
    title: string;
    startsAt?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    meetingUrl?: string | null;
    meetingLink?: string | null;
  },
): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/weeks/${weekId}/sessions`, { method: "POST", body });
}

export async function deleteSession(sessionId: string): Promise<ProgramPayload> {
  return apiClient<ProgramPayload>(`/trainer/sessions/${sessionId}`, { method: "DELETE" });
}
