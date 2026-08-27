import type { CalendarEvent, CalendarEventType } from "@/types/calendar";

export const CALENDAR_TYPE_LABEL: Record<CalendarEventType, string> = {
  SESSION: "Session",
  EXAM: "Exam",
  ASSIGNMENT: "Assignment",
  MILESTONE: "Milestone",
  DEADLINE: "Deadline",
  PROGRAM: "Course",
};

export const CALENDAR_TYPE_COLOR: Record<CalendarEventType, "violet" | "blue" | "orange" | "pink" | "green"> = {
  SESSION: "blue",
  EXAM: "violet",
  ASSIGNMENT: "orange",
  MILESTONE: "pink",
  DEADLINE: "orange",
  PROGRAM: "green",
};

export type UpcomingEventGroup = {
  label: string;
  events: Array<{
    id: string;
    title: string;
    type: string;
    timeLabel: string;
    color: "violet" | "blue" | "orange" | "pink" | "green";
  }>;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function getUpcomingEventGroups(events: CalendarEvent[], now = new Date(), limit = 8): UpcomingEventGroup[] {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const horizon = addDays(today, 14);
  const upcoming = events
    .map((event) => ({ event, at: new Date(event.startsAt) }))
    .filter(({ at }) => at.getTime() >= today.getTime() && at.getTime() < horizon.getTime())
    .sort((left, right) => left.at.getTime() - right.at.getTime())
    .slice(0, limit);

  const isSameDay = (left: Date, right: Date) => startOfDay(left).getTime() === startOfDay(right).getTime();
  const todayEvents = upcoming.filter(({ at }) => isSameDay(at, today));
  const tomorrowEvents = upcoming.filter(({ at }) => isSameDay(at, tomorrow));
  const laterEvents = upcoming.filter(({ at }) => startOfDay(at).getTime() > tomorrow.getTime());

  const toRow = (event: CalendarEvent, at: Date, later: boolean) => ({
    id: event.id,
    title: event.title,
    type: CALENDAR_TYPE_LABEL[event.type],
    timeLabel: later ? weekdayLabel(at) : timeLabel(at),
    color: CALENDAR_TYPE_COLOR[event.type],
  });

  const groups: UpcomingEventGroup[] = [];
  if (todayEvents.length > 0) {
    groups.push({
      label: `Today, ${today.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
      events: todayEvents.map(({ event, at }) => toRow(event, at, false)),
    });
  }
  if (tomorrowEvents.length > 0) {
    groups.push({
      label: `Tomorrow, ${tomorrow.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
      events: tomorrowEvents.map(({ event, at }) => toRow(event, at, false)),
    });
  }
  if (laterEvents.length > 0) {
    groups.push({
      label: "Upcoming",
      events: laterEvents.map(({ event, at }) => toRow(event, at, true)),
    });
  }
  return groups;
}

export function getCalendarSummary(events: CalendarEvent[], now = new Date()) {
  const today = startOfDay(now).getTime();
  const upcoming = events.filter((event) => new Date(event.startsAt).getTime() >= today);
  return {
    courseStarts: upcoming.filter((event) => event.type === "PROGRAM" && /starts$/i.test(event.title)).length,
    sessions: upcoming.filter((event) => event.type === "SESSION").length,
    exams: upcoming.filter((event) => event.type === "EXAM").length,
    deadlines: upcoming.filter((event) => event.type === "ASSIGNMENT" || event.type === "DEADLINE").length,
  };
}
