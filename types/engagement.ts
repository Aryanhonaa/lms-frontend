export type LeaderboardWeights = {
  progress: number;
  quiz: number;
  exam: number;
  milestone: number;
};

export type PublicLeaderboardEntry = {
  rank: number;
  trainee: { id: string; name: string };
  score: number;
  progressPercent: number;
  quizzesPassed: number;
  quizzesTotal: number;
  examsPassed: number;
  examsTotal: number;
  milestonesComplete: number;
  milestonesTotal: number;
};

export type OwnLeaderboardEntry = PublicLeaderboardEntry & {
  breakdown: {
    progress: number;
    quiz: number | null;
    exam: number | null;
    milestone: number | null;
    weights: LeaderboardWeights;
  };
};

export type LeaderboardBatch = {
  id: string;
  name: string;
  memberCount?: number;
};

export type LeaderboardBoard = {
  program: { id: string; title: string };
  batch?: LeaderboardBatch | null;
  batches?: LeaderboardBatch[];
  yourBatch?: { id: string; name: string } | null;
  you: OwnLeaderboardEntry | null;
  entries: PublicLeaderboardEntry[];
};

export type AchievementKey =
  | "FIRST_COURSE_COMPLETED"
  | "PERFECT_QUIZ"
  | "MILESTONE_MASTER"
  | "TOP_PERFORMER"
  | "PERFECT_ATTENDANCE"
  | "LEARNING_STREAK"
  | "EXAM_CHAMPION";

export type AchievementItem = {
  id: string;
  key: AchievementKey;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
};

export type FeedbackTargetKind = "COURSE" | "TRAINER" | "SESSION" | "MATERIAL";
export type FeedbackModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

export type FeedbackItem = {
  id: string;
  targetKind: FeedbackTargetKind;
  targetId: string;
  rating: number;
  comment: string;
  status: FeedbackModerationStatus;
  createdAt: string;
  program: { id: string; title: string } | null;
  author: { id: string; name: string };
};

export type FeedbackOptions = {
  courses: Array<{ id: string; title: string }>;
  trainers: Array<{ id: string; name: string; programId: string; programTitle: string }>;
  sessions: Array<{ id: string; title: string; programId: string; programTitle: string }>;
  materials: Array<{ id: string; title: string; kind: "LESSON" | "VIDEO" | "RESOURCE" | "REEL"; programId: string }>;
};

export type AnnouncementAudience = "EVERYONE" | "TRAINERS" | "TRAINEES" | "PROGRAM" | "TRAINEES_SELECTED";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  program: { id: string; title: string } | null;
  batch: { id: string; name: string } | null;
  recipients: Array<{ id: string; name: string }>;
  createdBy: { id: string; name: string };
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  programTitle: string | null;
  createdAt: string;
  read: boolean;
  href: string;
};

export type NotificationInbox = {
  unreadCount: number;
  notifications: NotificationItem[];
};
