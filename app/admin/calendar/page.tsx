"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/page-header";
import { CalendarBoard } from "@/features/calendar/calendar-board";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listAdminCalendar } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import type { CalendarEvent } from "@/types/calendar";

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminCalendar()
      .then((payload) => {
        setEvents(payload.events);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load calendar");
      });
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        subtitle="Sessions, exams, assignments, and course dates across the platform."
      />
      {error ? <ErrorState message={error} /> : null}
      {events === null && !error ? <LoadingState label="Loading calendar…" /> : null}
      {events && events.length === 0 ? (
        <EmptyState
          title="Nothing on the calendar"
          description="Course dates, sessions, exams, and assignment due dates appear here once they are scheduled."
        />
      ) : null}
      {events && events.length > 0 ? <CalendarBoard events={events} /> : null}
    </div>
  );
}
