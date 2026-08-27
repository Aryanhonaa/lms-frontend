"use client";

import { useEffect, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { CalendarBoard } from "@/features/calendar/calendar-board";
import { listTrainerCalendar } from "@/lib/api/calendar";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { CalendarEvent } from "@/types/calendar";

export default function TrainerCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainerCalendar()
      .then((payload) => {
        setEvents(payload.events);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load calendar");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Calendar" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {events === null && !error ? <LoadingState /> : null}
      {events && events.length === 0 ? (
        <EmptyState title="Nothing on the calendar" description="Sessions, exams, assignments, and program dates from your programs appear here." />
      ) : null}
      {events && events.length > 0 ? <CalendarBoard events={events} /> : null}
    </TrainerShell>
  );
}
