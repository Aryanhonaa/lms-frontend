export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type AttendancePerson = {
  id: string;
  name: string;
  email: string;
};

export type AttendanceSession = {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string | null;
  meetingLink: string | null;
  meetingUrl: string | null;
  week: { id: string; title: string; sortOrder: number };
  program: { id: string; title: string };
};

export type AttendanceRosterRow = {
  enrollmentId: string;
  trainee: AttendancePerson;
  status: AttendanceStatus | null;
  attendanceId: string | null;
  attendancePercent: number | null;
};

export type ProgramAttendancePayload = {
  program: { id: string; title: string };
  weeks: Array<{ id: string; title: string }>;
  sessions: AttendanceSession[];
  selectedSessionId: string | null;
  roster: AttendanceRosterRow[];
};

export type TraineeAttendanceProgram = {
  program: { id: string; title: string };
  enrollmentId: string;
  attendancePercent: number | null;
  history: Array<{ session: AttendanceSession; status: AttendanceStatus | null }>;
  upcoming: AttendanceSession[];
};
