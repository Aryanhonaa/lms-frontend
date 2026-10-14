import type {
  BatchTrainingStatus,
  LineOfBusiness,
  TraineeStage,
  TrackerBatch,
  TrackerTrainee,
} from "@/types/batch-tracker";

export type Tone = "slate" | "sky" | "amber" | "emerald" | "teal" | "rose";

export const TONE_CLASS: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  sky: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-800",
  emerald: "bg-emerald-50 text-emerald-800",
  teal: "bg-teal-50 text-teal-800",
  rose: "bg-rose-50 text-rose-800",
};

export const STAGE_META: Record<TraineeStage, { label: string; tone: Tone; hint: string }> = {
  IN_TRAINING: { label: "In training", tone: "slate", hint: "Working through the 25 training days." },
  EXAM_PENDING: { label: "Exam pending", tone: "amber", hint: "Training days are done; the final exam is next." },
  NOT_CERTIFIED: { label: "Not certified", tone: "amber", hint: "Took the final exam but did not pass." },
  CERTIFIED: { label: "Certified", tone: "emerald", hint: "Passed the final exam. Ready to hand over." },
  HANDED_OVER: { label: "Handed over", tone: "teal", hint: "Moved to the sales floor." },
  HR_ATTRITION: { label: "HR attrition", tone: "rose", hint: "Left within 3 working days of joining." },
  LEFT: { label: "Left", tone: "rose", hint: "Left or resigned during training." },
  TERMINATED: { label: "Terminated", tone: "rose", hint: "Removed by the trainer during training." },
};

export const STATUS_META: Record<BatchTrainingStatus, { label: string; tone: Tone }> = {
  UPCOMING: { label: "Upcoming", tone: "sky" },
  ONGOING: { label: "Ongoing", tone: "amber" },
  COMPLETED: { label: "Completed", tone: "emerald" },
};

export const LOB_LABEL: Record<LineOfBusiness, string> = {
  VOICE: "Voice",
  NON_VOICE: "Non-voice",
};

export const GLOSSARY = {
  actualHc: "Trainees received from HR, including anyone who joined within the first 3 working days.",
  hrAttrition: "Trainees who left within 3 working days of their own joining date.",
  day7Hc: "Headcount on working day 7, excluding anyone who has left. Throughput is measured against this.",
  trainingAttrition: "Trainees who left or were terminated after day 7, usually at the day-15 evaluation.",
  appeared: "Trainees who sat the final certification exam after 25 working days.",
  certified: "Trainees who passed the final exam. The percentage is out of those who appeared.",
  handover: "Certified trainees handed over to the sales floor.",
  pending: "Certified trainees still waiting for handover.",
  throughput: "Certified ÷ Day 7 HC.",
} as const;

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(ymd: string | null | undefined, withYear = false): string {
  if (!ymd) {
    return "–";
  }
  const date = new Date(`${ymd}T00:00:00Z`);
  return (withYear ? LONG_DATE : SHORT_DATE).format(date);
}

export function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? "–" : `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function batchTitle(batch: Pick<TrackerBatch, "code" | "name">): string {
  return batch.code ?? batch.name;
}

export function trainerNames(batch: Pick<TrackerBatch, "salesTrainer" | "supportTrainer">): string {
  const names = [batch.salesTrainer?.name, batch.supportTrainer?.name].filter(Boolean);
  return names.length > 0 ? names.join(" · ") : "No trainers assigned";
}

export function isExited(trainee: TrackerTrainee): boolean {
  return trainee.stage === "HR_ATTRITION" || trainee.stage === "LEFT" || trainee.stage === "TERMINATED";
}

export function monthBounds(value: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${value}-01`, to: `${value}-${String(last).padStart(2, "0")}` };
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const SHEET_COLUMNS = [
  "Month",
  "Year",
  "Batch No",
  "Batch Code",
  "Type",
  "Sales Trainer",
  "Support Trainer",
  "Start Date",
  "Target Completion",
  "Actual Completion",
  "Status",
  "Actual HC",
  "HR Attrition (<3 days)",
  "Day 7 HC",
  "Training Attrition",
  "Appeared for Exam",
  "Certified",
  "Certified %",
  "Handover",
  "Handover Pending",
  "Throughput %",
] as const;

export function sheetRow(batch: TrackerBatch): Array<string | number> {
  const funnel = batch.funnel;
  return [
    batch.month ? MONTH_NAMES[batch.month - 1] : "",
    batch.year ?? "",
    batch.batchNumber ?? "",
    batchTitle(batch),
    batch.lineOfBusiness ? LOB_LABEL[batch.lineOfBusiness] : "",
    batch.salesTrainer?.name ?? "",
    batch.supportTrainer?.name ?? "",
    batch.startDate ?? "",
    batch.targetCompletionDate ?? "",
    batch.actualCompletionDate ?? "",
    STATUS_META[batch.status].label,
    funnel.actualHc,
    funnel.hrAttrition,
    funnel.day7Hc,
    funnel.trainingAttrition,
    funnel.appeared,
    funnel.certified,
    formatPct(funnel.certifiedPct),
    funnel.handover,
    funnel.handoverPending,
    formatPct(funnel.throughputPct),
  ];
}

export function downloadCsv(filename: string, header: readonly string[], rows: Array<Array<string | number>>) {
  const text = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
