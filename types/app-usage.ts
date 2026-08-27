export type AppUsagePeriod = "daily" | "weekly" | "monthly";

export type AppUsageBucket = {
  key: string;
  label: string;
  start: string;
  end: string;
};

export type AppUsageTraineeRow = {
  id: string;
  name: string;
  seconds: number;
  buckets: Array<{ key: string; seconds: number }>;
};

export type AppUsageAnalytics = {
  period: AppUsagePeriod;
  timezone: string;
  mode: "comparison" | "individual";
  range: { start: string; end: string; label: string };
  summary: {
    totalSeconds: number;
    averageSeconds: number;
    activeTrainees: number;
    mostActive: { id: string; name: string; seconds: number } | null;
  };
  buckets: AppUsageBucket[];
  trainees: AppUsageTraineeRow[];
  truncated: boolean;
  filters: {
    programs: Array<{ id: string; title: string }>;
    batches: Array<{ id: string; name: string; programId: string }>;
    trainees: Array<{ id: string; name: string }>;
  };
};

export type AppUsageAnalyticsResponse = {
  analytics: AppUsageAnalytics;
};

export type AppUsageConfig = {
  heartbeatIntervalMs: number;
  inactivityThresholdMs: number;
  timezone: string;
};
