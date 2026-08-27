export type CalendarEventType = "SESSION" | "EXAM" | "ASSIGNMENT" | "MILESTONE" | "DEADLINE" | "PROGRAM";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  program: { id: string; title: string };
  sourceId: string;
};
