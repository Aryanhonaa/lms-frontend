export type TrainingProcess = "VOICE_SALES" | "NON_VOICE_SALES_SUPPORT";
export type TrainingBatchStatus = "ONGOING" | "COMPLETED";
export type TrackerTraineeStatus =
  | "JOINED"
  | "IN_TRAINING"
  | "HR_ATTRITION"
  | "TRAINING_ATTRITION"
  | "EXAM_ELIGIBLE"
  | "EXAM_PENDING"
  | "EXAM_FAILED"
  | "CERTIFIED"
  | "HANDOVER_PENDING"
  | "HANDED_OVER"
  | "TNI"
  | "ACTIVE"
  | "TERMINATED";

export type OutcomeCategory =
  | "ACTIVE"
  | "COMPLETED_CERTIFIED"
  | "COMPLETED_NOT_CERTIFIED"
  | "LEFT_MID_BATCH"
  | "TERMINATED";

export type CompletionStatus = "IN_PROGRESS" | "COMPLETED" | "LEFT" | "TERMINATED";
export type CertificationStatus = "PENDING" | "CERTIFIED" | "NOT_CERTIFIED" | "NOT_APPLICABLE";

export type PersonRef = { id: string; name: string; email: string; role?: string };

export type CourseRef = { id: string; title: string; status: string };

export type CountPercent = { count: number; percent: number | null };

export type OutcomeSummary = {
  totalEnrolled: number;
  active: CountPercent;
  completedCertified: CountPercent;
  completedNotCertified: CountPercent;
  leftMidBatch: CountPercent;
  joinedMidBatch: CountPercent;
  terminated: CountPercent;
};

export type TrackerBatchSummary = {
  id: string;
  month: number;
  year: number;
  batchNumber: number;
  code: string;
  process: TrainingProcess;
  courses: CourseRef[];
  course: CourseRef | null;
  trainingStartDate: string;
  targetCompletionDate: string;
  actualCompletionDate: string | null;
  status: TrainingBatchStatus;
  trainingDay: number;
  trainingDayLabel: string;
  progressPercent: number;
  salesTrainer: PersonRef;
  filesTrainer: PersonRef | null;
  day1Hc: number;
  day7Hc: number | null;
  currentHc: number;
  hrAttrition: number;
  trainingAttrition: number;
  examEligible: number;
  appeared: number;
  certified: number;
  failed: number;
  certifiedPercent: number | null;
  handedOver: number;
  handoverPending: number;
  throughputPercent: number | null;
  outcomes: OutcomeSummary;
};

export type TrackerTrainee = {
  id: string;
  user: PersonRef;
  batch: { id: string; code: string; process: TrainingProcess } | null;
  process: TrainingProcess;
  trainer: PersonRef | null;
  team: string;
  supervisorName: string;
  joiningDate: string;
  enrollmentDate?: string;
  status: TrackerTraineeStatus;
  outcomeCategory: OutcomeCategory;
  completionStatus: CompletionStatus;
  certificationStatus: CertificationStatus;
  courseCompletionPercent: number | null;
  joinedMidBatch: boolean;
  exitDate: string | null;
  exitReason: string | null;
  examEligible: boolean;
  examAppeared: boolean;
  examPassed: boolean;
  examDate: string | null;
  examRemarks: string;
  handoverDate: string | null;
  handoverTeam: string;
  handoverSupervisor: string;
  handoverRemarks: string;
  attritions: Array<{ id: string; kind: "HR" | "TRAINING"; date: string; reason: string; remarks: string }>;
  audits: Array<{
    id: string;
    weekNumber: number;
    auditDate: string;
    auditType: "CALL" | "CHAT";
    score: number;
    remarks: string;
    isReAudit: boolean;
  }>;
  averageAuditScore: number | null;
  tni: {
    id: string;
    status: string;
    startDate: string;
    identifiedGap: string;
    supportPlan: string;
    supportStartDate: string | null;
    reviewDate: string | null;
    trainerRemarks: string;
    averageScore: number;
    reAuditScore: number | null;
    finalDecision: string | null;
  } | null;
};

export type TrackerDashboard = {
  kpis: {
    totalBatches: number;
    activeBatches: number;
    completedBatches: number;
    totalTrainees: number;
    currentTrainees: number;
    hrAttrition: number;
    trainingAttrition: number;
    examAppeared: number;
    certified: number;
    certificationPercent: number | null;
    handoverPending: number;
    averageThroughput: number | null;
    tniCount: number;
  };
  outcomes: OutcomeSummary;
  batchProgress: TrackerBatchSummary[];
  throughput: Array<{ id: string; code: string; throughputPercent: number | null }>;
  attrition: { hr: number; training: number };
  certification: { appeared: number; certified: number; handedOver: number };
  tni: { open: number; cleared: number; review: number };
};

export type TrackerTniCase = {
  id: string;
  status: string;
  startDate: string;
  identifiedGap: string;
  supportPlan: string;
  supportStartDate: string | null;
  reviewDate: string | null;
  trainerRemarks: string;
  averageScore: number;
  reAuditScore: number | null;
  finalDecision: string | null;
  trainer: PersonRef;
  trainee: TrackerTrainee;
};

export type TrackerAudit = {
  id: string;
  weekNumber: number;
  auditDate: string;
  auditType: "CALL" | "CHAT";
  score: number;
  remarks: string;
  isReAudit: boolean;
  auditor: PersonRef;
  trainee: TrackerTrainee;
};
