import { apiClient } from "@/lib/api/client";
import type { CalendarEvent, TrainerCalendarFilters } from "@/types/calendar";

export async function listTrainerCalendar(): Promise<{ events: CalendarEvent[]; filters: TrainerCalendarFilters }> {
  return apiClient<{ events: CalendarEvent[]; filters: TrainerCalendarFilters }>("/trainer/calendar");
}

export async function listTraineeCalendar(): Promise<{ events: CalendarEvent[] }> {
  return apiClient<{ events: CalendarEvent[] }>("/trainee/calendar");
}

export async function createCalendarActivity(input: {
  programId: string;
  batchId: string;
  audience: "TRAINEE" | "BATCH";
  traineeUserId?: string | null;
  title: string;
  description?: string;
  date: string;
  time: string;
}): Promise<{ activity: unknown }> {
  return apiClient("/trainer/calendar/activities", { method: "POST", body: input });
}

export async function deleteCalendarActivity(activityId: string): Promise<{ deleted: boolean }> {
  return apiClient(`/trainer/calendar/activities/${activityId}`, { method: "DELETE" });
}
