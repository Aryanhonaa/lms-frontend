"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { CalendarBoard } from "@/features/calendar/calendar-board";
import { listTraineeCalendar } from "@/lib/api/calendar";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { CalendarEvent } from "@/types/calendar";

export default function TraineeCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTraineeCalendar()
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
    <TraineeShell title="Calendar" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {events === null && !error ? <LoadingState /> : null}
      {events && events.length === 0 ? (
        <EmptyState title="Nothing on the calendar" description="Your sessions, exams, assignment due dates, and personal deadlines appear here." />
      ) : null}
      {events && events.length > 0 ? <CalendarBoard events={events} /> : null}
    </TraineeShell>
  );
}
