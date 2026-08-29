import type { ProgramStatus } from "@/types/domain";
import type { CalendarEvent } from "@/types/calendar";

export type DashboardRange = "week" | "month" | "quarter";

export type TrainerDashboardStatistics = {
  programs: { total: number; active: number };
  trainees: { total: number };
  pendingReviews: { total: number };
  upcomingAssessments: { total: number };
  pendingSubmissions: { total: number };
};

export type TrainerDashboardProgram = {
  id: string;
  title: string;
  category: string;
  status: ProgramStatus;
  durationWeeks: number;
  traineeCount: number;
  progress: number | null;
  outcomeCounts?: { inProgress: number; completed: number; failed: number };
  href: string;
};

export type TrainerUpcomingEvent = CalendarEvent & { href: string };

export type TrainerRecentSubmission = {
  id: string;
  status: string;
  isLate: boolean;
  submittedAt: string | null;
  assignment: { id: string; title: string };
  program: { id: string; title: string };
  trainee: { id: string; name: string; email: string };
  href: string;
};

export type TrainerAttentionItem = {
  id: string;
  trigger: string;
  createdAt: string;
  trainee: { id: string; name: string; email: string };
  program: { id: string; title: string };
  href: string;
};

export type TrainerDashboardErrors = {
  statistics: string | null;
  programs: string | null;
  upcoming: string | null;
  submissions: string | null;
  attention: string | null;
};

export type TrainerDashboard = {
  range: DashboardRange;
  rangeStart: string;
  rangeEnd: string;
  statistics: TrainerDashboardStatistics;
  programs: TrainerDashboardProgram[];
  upcoming: TrainerUpcomingEvent[];
  recentSubmissions: TrainerRecentSubmission[];
  attention: TrainerAttentionItem[];
  errors: TrainerDashboardErrors;
};

export type TrainerDashboardResponse = {
  dashboard: TrainerDashboard;
};

export type TrainerSearchHit = {
  id: string;
  title?: string;
  name?: string;
  email?: string;
  subtitle?: string;
  programTitle?: string;
  href: string;
};

export type TrainerSearchResults = {
  programs: TrainerSearchHit[];
  trainees: TrainerSearchHit[];
  assignments: TrainerSearchHit[];
  assessments: TrainerSearchHit[];
};
