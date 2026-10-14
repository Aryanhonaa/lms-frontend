"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CALENDAR_TYPE_COLOR, CALENDAR_TYPE_LABEL } from "@/lib/calendar/upcoming";
import type { CalendarEvent } from "@/types/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COLOR: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-sky-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  green: "bg-emerald-500",
};

const CARD =
  "rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function eventDate(event: CalendarEvent): Date {
  return new Date(event.startsAt);
}

function eventTimeLabel(date: Date): string {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return "All day";
  }
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CalendarBoard({
  events,
  selectedBatches = [],
  selectedTrainees = [],
  showDayDetails = false,
}: {
  events: CalendarEvent[];
  selectedBatches?: Array<{ id: string; name: string }>;
  selectedTrainees?: Array<{ id: string; name: string }>;
  showDayDetails?: boolean;
}) {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthEvents = events.filter((event) => {
    const at = eventDate(event);
    return at.getMonth() === month && at.getFullYear() === year;
  });
  const selectedDayEvents = events
    .filter((event) => startOfDay(eventDate(event)) === startOfDay(selectedDate))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setCursor(next);
    setSelectedDate(next);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <section className={CARD}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium tracking-wide text-slate-400 uppercase">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-20 rounded-xl" />;
            }
            const date = new Date(year, month, day);
            const isToday = startOfDay(date) === startOfDay(now);
            const dayEvents = events.filter((event) => startOfDay(eventDate(event)) === startOfDay(date));
            return (
              <button
                type="button"
                key={day}
                disabled={!showDayDetails}
                aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}, ${dayEvents.length} activities`}
                aria-pressed={showDayDetails ? startOfDay(date) === startOfDay(selectedDate) : undefined}
                onClick={() => setSelectedDate(date)}
                className={`h-20 rounded-xl border p-1.5 text-left ${
                  showDayDetails ? "transition hover:border-violet-200" : ""
                } ${
                  showDayDetails && startOfDay(date) === startOfDay(selectedDate)
                    ? "border-violet-300 bg-violet-100"
                    : isToday
                      ? "border-violet-200 bg-violet-50"
                      : "border-transparent bg-slate-50/70"
                }`}
              >
                <p className={`text-xs font-medium ${isToday || (showDayDetails && startOfDay(date) === startOfDay(selectedDate)) ? "text-violet-700" : "text-slate-700"}`}>{day}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${COLOR[CALENDAR_TYPE_COLOR[event.type]]}`} />
                  ))}
                  {dayEvents.length > 4 ? <span className="text-[9px] leading-3 text-slate-500">+{dayEvents.length - 4}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className={CARD}>
        {showDayDetails ? (
          <>
            <h2 className="text-base font-semibold text-slate-900">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            <ul className="mt-4 space-y-3">
              {selectedDayEvents.length === 0 ? (
                <li className="text-sm text-slate-500">No activities scheduled for this day.</li>
              ) : (
                selectedDayEvents.map((event) => {
              const relatedBatchNames = event.batch
                ? [event.batch.name]
                : selectedBatches.filter((batch) => event.batchIds?.includes(batch.id)).map((batch) => batch.name);
              const relatedTraineeNames = event.trainee
                ? [event.trainee.name]
                : selectedTrainees
                    .filter((trainee) => event.traineeIds?.includes(trainee.id))
                    .map((trainee) => trainee.name);
              return (
                    <li key={event.id} className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${COLOR[CALENDAR_TYPE_COLOR[event.type]]}`} />
                        <p className="text-sm font-medium text-slate-900">{event.title}</p>
                      </div>
                      <p className="mt-1 pl-4 text-xs text-slate-500">
                        {CALENDAR_TYPE_LABEL[event.type]}
                        {event.program.title ? ` · ${event.program.title}` : ""}
                        {relatedBatchNames.length ? ` · ${relatedBatchNames.join(", ")}` : ""}
                        {relatedTraineeNames.length ? ` · ${relatedTraineeNames.join(", ")}` : ""}
                        {" · "}
                        {eventTimeLabel(eventDate(event))}
                      </p>
                      {event.description ? (
                        <p className="mt-2 pl-4 text-xs leading-5 text-slate-600">{event.description}</p>
                      ) : null}
                    </li>
              );
                })
              )}
            </ul>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-slate-900">This month</h2>
            <ul className="mt-4 space-y-3">
              {monthEvents.length === 0 ? (
                <li className="text-sm text-slate-500">No scheduled items this month.</li>
              ) : (
                monthEvents.map((event) => (
                  <li key={event.id} className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${COLOR[CALENDAR_TYPE_COLOR[event.type]]}`} />
                      <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    </div>
                    <p className="mt-1 pl-4 text-xs text-slate-500">
                      {CALENDAR_TYPE_LABEL[event.type]} · {event.program.title} ·{" "}
                      {eventDate(event).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
