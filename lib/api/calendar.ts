import { apiClient } from "@/lib/api/client";
import type { CalendarEvent } from "@/types/calendar";

export async function listTrainerCalendar(): Promise<{ events: CalendarEvent[] }> {
  return apiClient<{ events: CalendarEvent[] }>("/trainer/calendar");
}

export async function listTraineeCalendar(): Promise<{ events: CalendarEvent[] }> {
  return apiClient<{ events: CalendarEvent[] }>("/trainee/calendar");
}
