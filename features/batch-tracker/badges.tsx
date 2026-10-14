import type { BatchTrainingStatus, LineOfBusiness, TraineeStage } from "@/types/batch-tracker";
import { LOB_LABEL, STAGE_META, STATUS_META, TONE_CLASS } from "./format";

const PILL = "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium";

export function TraineeStageBadge({ stage }: { stage: TraineeStage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={`${PILL} ${TONE_CLASS[meta.tone]}`} title={meta.hint}>
      {meta.label}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchTrainingStatus }) {
  const meta = STATUS_META[status];
  return <span className={`${PILL} ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>;
}

export function LobChip({ value }: { value: LineOfBusiness | null }) {
  if (!value) {
    return null;
  }
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
      {LOB_LABEL[value]}
    </span>
  );
}

export function LateTag() {
  return (
    <span
      className="inline-flex items-center rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] font-medium text-slate-500"
      title="Joined after the first day of the batch"
    >
      Joined late
    </span>
  );
}
