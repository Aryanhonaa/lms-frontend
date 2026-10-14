export type CalendarEventType =
  | "SESSION"
  | "EXAM"
  | "QUIZ"
  | "ASSIGNMENT"
  | "TASK"
  | "NOTIFICATION"
  | "MILESTONE"
  | "DEADLINE"
  | "PROGRAM"
  | "HOLIDAY";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  program: { id: string; title: string };
  sourceId: string;
  description?: string;
  batchIds?: string[];
  traineeIds?: string[];
  batch?: { id: string; name: string } | null;
  trainee?: { id: string; name: string } | null;
};

export type TrainerCalendarFilters = {
  courses: Array<{ id: string; title: string }>;
  batches: Array<{ id: string; programId: string; name: string }>;
  trainees: Array<{
    id: string;
    name: string;
    programId: string;
    batchId: string;
    batchName: string;
  }>;
};
