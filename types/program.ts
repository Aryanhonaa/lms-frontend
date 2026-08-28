import type {
  Difficulty,
  ProgramStatus,
  QuizKind,
  ResourceKind,
  TrainingMode,
  VideoSource,
} from "@/types/domain";

export type PersonRef = {
  id: string;
  name: string;
  email: string;
};

export type QuestionOption = {
  id: string;
  sortOrder: number;
  label: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  sortOrder: number;
  prompt: string;
  points: number;
  options: QuestionOption[];
};

export type Quiz = {
  id: string;
  kind: QuizKind;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMin: number | null;
  maxAttempts: number | null;
  randomized: boolean;
  questions: Question[];
};

export type StoredFileFields = {
  fileKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  storageProvider?: string | null;
};

export type Lesson = {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  durationMin: number;
  required: boolean;
  attachments?: ContentAttachment[];
};

export type ContentAttachment = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt?: string;
};

export type Video = StoredFileFields & {
  id: string;
  sortOrder: number;
  title: string;
  source: VideoSource;
  url: string;
  durationMin: number;
};

export type Resource = StoredFileFields & {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  url: string;
  kind: ResourceKind;
  required: boolean;
};

export type Reel = StoredFileFields & {
  id: string;
  sortOrder: number;
  title: string;
  url: string;
  durationSec: number;
};

export type Assignment = {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  instructions?: string;
  dueDate: string | null;
  maxScore: number;
  status?: "DRAFT" | "PUBLISHED" | "CLOSED";
  allowFileUpload?: boolean;
  allowTextResponse?: boolean;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
  maxAttempts?: number;
  attachments?: ContentAttachment[];
  linkedItemType?: string | null;
  linkedItemId?: string | null;
};

export type TrainingSession = {
  id: string;
  sortOrder: number;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  meetingUrl: string | null;
  meetingLink?: string | null;
};

export type Day = {
  id: string;
  sortOrder: number;
  title: string;
  lessons: Lesson[];
  videos: Video[];
  resources: Resource[];
  reels: Reel[];
  assignments: Assignment[];
  quizzes: Quiz[];
};

export type Week = {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  objectives: string[];
  startDate: string | null;
  endDate: string | null;
  days: Day[];
  quizzes: Quiz[];
  trainingSessions: TrainingSession[];
};

export type MilestoneRequirement = {
  id: string;
  sortOrder: number;
  kind: "WEEKS_COMPLETED" | "ASSESSMENTS_PASSED" | "ASSIGNMENTS_COMPLETE" | "ATTENDANCE" | "CUSTOM";
  label: string;
  targetCount: number;
};

export type Milestone = {
  id: string;
  sortOrder: number;
  title: string;
  afterWeekIndex: number;
  requirements: MilestoneRequirement[];
  exam: Quiz | null;
};

export type ProgramSummary = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  durationWeeks: number;
  trainingMode: TrainingMode;
  progressThreshold?: number | string;
  examScoreThreshold?: number | string;
  status: ProgramStatus;
  startDate: string | null;
  endDate: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  createdByUserId: string;
  rejectedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: PersonRef;
  rejectedBy: PersonRef | null;
  _count?: { weeks: number; enrollments?: number };
};

export type ProgramTree = ProgramSummary & {
  learningObjectives: string[];
  prerequisites: string[];
  weeks: Week[];
  milestones: Milestone[];
  quizzes: Quiz[];
};

export type CreateProgramInput = {
  title: string;
  description?: string;
  category?: string;
  difficulty?: Difficulty;
  durationWeeks?: number;
  trainingMode?: TrainingMode;
  startDate?: string | null;
  endDate?: string | null;
  learningObjectives?: string[];
  prerequisites?: string[];
};

export type QuizInput = {
  title: string;
  description?: string;
  passingScore?: number;
  timeLimitMin?: number | null;
  maxAttempts?: number | null;
  randomized?: boolean;
  questions?: Array<{
    prompt: string;
    points?: number;
    options: Array<{ label: string; isCorrect: boolean }>;
  }>;
};
