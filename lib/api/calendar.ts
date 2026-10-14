import { apiClient } from "@/lib/api/client";
import type { CalendarEvent, TrainerCalendarFilters } from "@/types/calendar";

export async function listTrainerCalendar(): Promise<{ events: CalendarEvent[]; filters: TrainerCalendarFilters }> {
  return apiClient<{ events: CalendarEvent[]; filters: TrainerCalendarFilters }>("/trainer/calendar");
}

export async function listTraineeCalendar(): Promise<{ events: CalendarEvent[] }> {
  return apiClient<{ events: CalendarEvent[] }>("/trainee/calendar");
}
