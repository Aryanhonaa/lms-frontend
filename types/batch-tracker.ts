export type LineOfBusiness = "VOICE" | "NON_VOICE";

export type BatchTrainingStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export type TraineeStage =
  | "IN_TRAINING"
  | "EXAM_PENDING"
  | "NOT_CERTIFIED"
  | "CERTIFIED"
  | "HANDED_OVER"
  | "HR_ATTRITION"
  | "LEFT"
  | "TERMINATED";

export type Attrition = "HR" | "EARLY" | "TRAINING" | null;

export type BatchFunnel = {
  actualHc: number;
  joinedLate: number;
  hrAttrition: number;
  earlyExits: number;
  day7Hc: number;
  day7Locked: boolean;
  trainingAttrition: number;
  terminated: number;
  inTraining: number;
  examPending: number;
  appeared: number;
  certified: number;
  notCertified: number;
  certifiedPct: number | null;
  handover: number;
  handoverPct: number | null;
  handoverPending: number;
  throughputPct: number | null;
};

export type PersonName = { id: string; name: string };

export type TrackerBatch = {
  id: string;
  code: string | null;
  name: string;
  program: { id: string; title: string };
  lineOfBusiness: LineOfBusiness | null;
  month: number | null;
  year: number | null;
  batchNumber: number | null;
  salesTrainer: PersonName | null;
  supportTrainer: PersonName | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  status: BatchTrainingStatus;
  trainingDay: number;
  totalDays: number;
  milestones: {
    joinWindowCloses: string | null;
    headcountLocks: string | null;
    evaluation: string | null;
    exam: string | null;
  };
  funnel: BatchFunnel;
};

export type TrackerOverview = {
  today: string;
  summary: {
    batches: number;
    ongoing: number;
    completed: number;
    upcoming: number;
    funnel: BatchFunnel;
  };
  batches: TrackerBatch[];
  filterOptions: {
    programs: Array<{ id: string; title: string }>;
    trainers: PersonName[];
  };
};

export type TrackerTrainee = {
  enrollmentId: string;
  trainee: { id: string; name: string; email: string };
  status: "ACTIVE" | "COMPLETED" | "WITHDRAWN" | "TERMINATED";
  stage: TraineeStage;
  attrition: Attrition;
  joinedAt: string | null;
  joinDay: number;
  joinedLate: boolean;
  progress: number;
  courseOutcome: "PENDING" | "PASSED" | "FAILED";
  exam: { score: number | null; passed: boolean | null; needsReview: boolean; submittedAt: string | null } | null;
  appeared: boolean;
  certified: boolean;
  certificate: { status: "VALID" | "REVOKED"; issuedAt: string; certificateId: string } | null;
  handedOverAt: string | null;
  team: { id: string; name: string } | null;
  exitedAt: string | null;
  exitDay: number | null;
  exitReason: string;
  exitedBy: PersonName | null;
  canRemove: boolean;
};

export type TrackerDetail = {
  today: string;
  canManage: boolean;
  batch: TrackerBatch & { capacity: number };
  trainees: TrackerTrainee[];
};

export type TrackerFilters = {
  q?: string;
  programId?: string;
  trainerId?: string;
  lineOfBusiness?: LineOfBusiness;
  status?: BatchTrainingStatus;
  from?: string;
  to?: string;
};

export type Team = {
  id: string;
  name: string;
  lineOfBusiness: LineOfBusiness | null;
  supervisorName: string;
  isActive: boolean;
  memberCount: number;
};

export type WorkCalendarState = {
  weeklyOffDays: number[];
  holidays: Array<{ id: string; date: string; name: string }>;
};

export type BatchCodePreview = {
  month: number;
  year: number;
  batchNumber: number;
  code: string;
  targetCompletionDate: string | null;
  skipped: { weeklyOff: number; holidays: Array<{ date: string; name: string }> } | null;
};
