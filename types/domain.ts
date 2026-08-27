export type Role = "SUPER_ADMIN" | "ADMIN" | "TRAINER" | "TRAINEE";

export type ProgramStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export type TrainingMode = "SCHEDULED" | "PROGRESSION";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type ProgramTrainerRole = "OWNER" | "CO_TRAINER";

export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "WITHDRAWN";

export type VideoSource = "YOUTUBE" | "UPLOADED" | "EXTERNAL";

export type ResourceKind = "DOCUMENT" | "ARTICLE" | "GITHUB" | "YOUTUBE" | "WEBSITE" | "TUTORIAL";

export type QuizKind = "PRACTICE_QUIZ" | "WEEKLY_QUIZ" | "WEEKLY_EXAM" | "MILESTONE_EXAM" | "FINAL_EXAM";
