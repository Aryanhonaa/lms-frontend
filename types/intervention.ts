export type InterventionTrigger = "PROGRESS_BELOW_THRESHOLD" | "EXAM_SCORE_BELOW_THRESHOLD";
export type InterventionStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type IndividualRequirementType =
  | "VIDEO"
  | "READING"
  | "QUIZ"
  | "ASSIGNMENT"
  | "SESSION"
  | "EXAM_RETRY"
  | "CUSTOM";
export type IndividualRequirementStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

export type InterventionPerson = {
  id: string;
  name: string;
  email: string;
};

export type InterventionFlag = {
  id: string;
  trigger: InterventionTrigger;
  status: InterventionStatus;
  progress: number | null;
  examScore: number | null;
  examTitle: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  trainee: InterventionPerson;
  program: { id: string; title: string };
  batch: { id: string; name: string };
  enrollmentId: string;
  openRequirements: number;
};

export type IndividualRequirement = {
  id: string;
  type: IndividualRequirementType;
  title: string;
  description: string;
  trainerMessage: string;
  reason: string;
  deadline: string | null;
  status: IndividualRequirementStatus;
  completedAt: string | null;
  createdAt: string;
  trainee: InterventionPerson;
  trainer: InterventionPerson;
  program: { id: string; title: string };
  batch: { id: string; name: string };
  enrollmentId: string;
  interventionFlagId: string | null;
};

export type TrainerEnrollment = {
  id: string;
  progress: number | null;
  trainee: InterventionPerson;
  program: { id: string; title: string };
};
