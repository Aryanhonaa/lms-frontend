import { apiClient } from "@/lib/api/client";
import type { AttendanceStatus, ProgramAttendancePayload, TraineeAttendanceProgram } from "@/types/attendance";

export async function getProgramAttendance(programId: string, sessionId?: string): Promise<ProgramAttendancePayload> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return apiClient<ProgramAttendancePayload>(`/trainer/programs/${programId}/attendance${query}`);
}

export async function markSessionAttendance(
  sessionId: string,
  records: Array<{ enrollmentId: string; status: AttendanceStatus }>,
): Promise<ProgramAttendancePayload> {
  return apiClient<ProgramAttendancePayload>(`/trainer/sessions/${sessionId}/attendance`, {
    method: "PUT",
    body: { records },
  });
}

export async function updateAttendance(
  id: string,
  status: AttendanceStatus,
): Promise<{ attendance: { id: string; status: AttendanceStatus } }> {
  return apiClient(`/trainer/attendance/${id}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function listTraineeAttendance(): Promise<{ programs: TraineeAttendanceProgram[] }> {
  return apiClient<{ programs: TraineeAttendanceProgram[] }>("/trainee/attendance");
}
