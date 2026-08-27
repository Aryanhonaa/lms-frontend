import type { AccessStatus } from "@/types/assessment";
import type { AttachmentView } from "@/types/files";

export type AssignmentSubmissionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED"
  | "CHANGES_REQUESTED"
  | "COMPLETED";

export type PersonRef = {
  id: string;
  name: string;
  email: string;
};

export type SubmissionFileView = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type AssignmentSubmissionView = {
  id: string | null;
  status: AssignmentSubmissionStatus;
  body: string;
  revision: number;
  isLate?: boolean;
  submittedAt: string | null;
  score: number | null;
  trainerComment: string;
  gradedBy: PersonRef | null;
  gradedAt: string | null;
  updatedAt?: string | null;
  maxScore: number;
  files: SubmissionFileView[];
};

export type AssignmentCatalog = {
  assignment: {
    id: string;
    title: string;
    description: string;
    instructions?: string;
    dueDate: string | null;
    maxScore: number;
    programId: string;
    programTitle: string;
    location: string;
    status: AccessStatus;
    lifecycleStatus?: "DRAFT" | "PUBLISHED" | "CLOSED";
    reason: string | null;
    allowFileUpload?: boolean;
    allowTextResponse?: boolean;
    allowLateSubmission?: boolean;
    allowResubmission?: boolean;
    maxAttempts?: number;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    attemptCount?: number;
    pastDue?: boolean;
    attachments?: AttachmentView[];
  };
  submission: AssignmentSubmissionView;
  attempts?: AssignmentSubmissionView[];
  canSubmit: boolean;
  submitBlockReason?: string | null;
};

export type TrainerAssignmentSummary = {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate: string | null;
  maxScore: number;
  programId: string;
  programTitle?: string;
  location: string;
  submissionCount: number;
  pendingReview: number;
  lifecycleStatus?: string;
};

export type TrainerSubmission = {
  id: string;
  status: Exclude<AssignmentSubmissionStatus, "NOT_STARTED">;
  body: string;
  revision: number;
  isLate?: boolean;
  submittedAt: string | null;
  score: number | null;
  trainerComment: string;
  gradedAt: string | null;
  gradedBy: PersonRef | null;
  trainee: PersonRef;
  batch?: { id: string; name: string };
  files?: SubmissionFileView[];
};

export type TrainerAssignmentDetail = TrainerAssignmentSummary & {
  attachments?: AttachmentView[];
};

export type BatchRef = {
  id: string;
  name: string;
};

export type TrainerRosterRow = {
  enrollmentId: string;
  trainee: PersonRef;
  traineeId: string;
  batch?: BatchRef;
  status: AssignmentSubmissionStatus;
  latest: AssignmentSubmissionView | null;
  attempts: AssignmentSubmissionView[];
};
