import { apiClient } from "@/lib/api/client";
import type {
  BatchCodePreview,
  Team,
  TrackerDetail,
  TrackerFilters,
  TrackerOverview,
  WorkCalendarState,
} from "@/types/batch-tracker";

export type TrackerRole = "trainer" | "admin";

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getBatchTracker(role: TrackerRole, filters: TrackerFilters = {}): Promise<TrackerOverview> {
  return apiClient(`/${role}/batch-tracker${toQuery(filters)}`);
}

export function getBatchTrackerDetail(role: TrackerRole, batchId: string): Promise<TrackerDetail> {
  return apiClient(`/${role}/batch-tracker/${batchId}`);
}

export function previewBatchCode(
  role: TrackerRole,
  input: { startDate?: string; batchNumber?: number },
): Promise<BatchCodePreview> {
  return apiClient(`/${role}/batch-codes/preview${toQuery(input)}`);
}

export function recordExit(
  role: TrackerRole,
  enrollmentId: string,
  input: { type: "LEFT" | "TERMINATED"; date?: string; reason?: string },
): Promise<{ updated: boolean }> {
  return apiClient(`/${role}/enrollments/${enrollmentId}/exit`, { method: "POST", body: input });
}

export function removeEnrollment(
  role: TrackerRole,
  enrollmentId: string,
  reason?: string,
): Promise<{ removed: boolean }> {
  return apiClient(`/${role}/enrollments/${enrollmentId}/remove`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function reinstateEnrollment(role: TrackerRole, enrollmentId: string): Promise<{ updated: boolean }> {
  return apiClient(`/${role}/enrollments/${enrollmentId}/reinstate`, { method: "POST" });
}

export function setJoinedDate(role: TrackerRole, enrollmentId: string, date: string): Promise<{ updated: boolean }> {
  return apiClient(`/${role}/enrollments/${enrollmentId}/joined-date`, { method: "PATCH", body: { date } });
}

export function handOver(
  role: TrackerRole,
  batchId: string,
  input: { enrollmentIds: string[]; teamId: string; date?: string },
): Promise<{ handedOver: number; skipped: number }> {
  return apiClient(`/${role}/batches/${batchId}/handover`, { method: "POST", body: input });
}

export function undoHandover(role: TrackerRole, enrollmentId: string): Promise<{ updated: boolean }> {
  return apiClient(`/${role}/enrollments/${enrollmentId}/handover`, { method: "DELETE" });
}

export function updateTrackedBatch(
  role: TrackerRole,
  batchId: string,
  input: { actualCompletionDate?: string | null },
): Promise<unknown> {
  return apiClient(role === "admin" ? `/admin/batches/${batchId}` : `/trainer/batches/${batchId}`, {
    method: "PATCH",
    body: input,
  });
}

export function listTeams(role: TrackerRole): Promise<{ teams: Team[] }> {
  return apiClient(`/${role}/teams`);
}

export function createTeam(input: {
  name: string;
  lineOfBusiness?: string | null;
  supervisorName?: string;
}): Promise<{ team: Team }> {
  return apiClient("/admin/teams", { method: "POST", body: input });
}

export function updateTeam(
  teamId: string,
  input: { name?: string; supervisorName?: string; isActive?: boolean; lineOfBusiness?: string | null },
): Promise<{ team: Team }> {
  return apiClient(`/admin/teams/${teamId}`, { method: "PATCH", body: input });
}

export function getWorkCalendar(role: TrackerRole): Promise<WorkCalendarState> {
  return apiClient(`/${role}/work-calendar`);
}

export function setWeeklyOffDays(weeklyOffDays: number[]): Promise<WorkCalendarState> {
  return apiClient("/admin/work-calendar/weekly-off-days", { method: "PUT", body: { weeklyOffDays } });
}

export function addHolidays(holidays: Array<{ date: string; name: string }>): Promise<WorkCalendarState> {
  return apiClient("/admin/holidays", { method: "POST", body: { holidays } });
}

export function removeHoliday(holidayId: string): Promise<WorkCalendarState> {
  return apiClient(`/admin/holidays/${holidayId}`, { method: "DELETE" });
}
