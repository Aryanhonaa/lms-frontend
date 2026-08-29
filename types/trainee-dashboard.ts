import type { CalendarEvent } from "@/types/calendar";
import type { CourseOutcome, CourseOutcomeView } from "@/types/learning";
import type { DashboardRange } from "@/types/trainer-dashboard";

export type { DashboardRange };

export type TraineeDashboardStatistics = {
  enrolledPrograms: { total: number; active: number; completed: number; failed: number };
  overallProgress: { percent: number };
  pendingAssignments: { total: number };
  upcomingAssessments: { total: number };
};

export type TraineeCurrentLearning = {
  program: { id: string; title: string; category: string; durationWeeks: number };
  enrollmentStatus: string;
  course: CourseOutcomeView;
  percent: number;
  currentWeek: { id: string; title: string; sortOrder: number; status: string } | null;
  currentDay: { id: string; title: string; sortOrder: number; status: string } | null;
  nextActivity: { type: string; id: string; title: string; weekTitle: string; dayTitle: string | null } | null;
  remainingMinutes: number | null;
  continueHref: string;
  materialsHref: string;
  quizzesHref: string;
  assignmentsHref: string;
  programHref: string;
  progressHref: string;
  milestones: {
    completed: Array<{ id: string; title: string }>;
    upcoming: { id: string; title: string } | null;
    current: { id: string; title: string } | null;
  };
};

export type TraineeTopStudent = {
  programTitle: string;
  trainee: { id: string; name: string };
  rank: number;
  score: number;
  progressPercent: number;
  isYou: boolean;
  href: string;
};

export type TraineeUpcomingEvent = CalendarEvent & { href: string };

export type TraineePendingAssignment = {
  id: string;
  title: string;
  programTitle: string;
  dueDate: string | null;
  status: string;
  isLate: boolean;
  href: string;
};

export type TraineeDashboardAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  programTitle: string | null;
  createdAt: string;
  href: string;
};

export type TraineeDashboard = {
  range: DashboardRange;
  rangeStart: string;
  rangeEnd: string;
  statistics: TraineeDashboardStatistics;
  currentLearning: TraineeCurrentLearning | null;
  topStudent: TraineeTopStudent | null;
  upcoming: TraineeUpcomingEvent[];
  pendingAssignments: TraineePendingAssignment[];
  announcements: TraineeDashboardAnnouncement[];
  otherPrograms: Array<{ id: string; title: string; percent: number; outcome?: CourseOutcome; href: string }>;
  errors: {
    learning: string | null;
    upcoming: string | null;
    assignments: string | null;
    announcements: string | null;
    topStudent: string | null;
  };
};

export type TraineeDashboardResponse = {
  dashboard: TraineeDashboard;
};

export type TraineeSearchHit = {
  id: string;
  title?: string;
  name?: string;
  subtitle?: string;
  href: string;
};

export type TraineeSearchResults = {
  programs: TraineeSearchHit[];
  materials: TraineeSearchHit[];
  assignments: TraineeSearchHit[];
  assessments: TraineeSearchHit[];
  announcements: TraineeSearchHit[];
};
