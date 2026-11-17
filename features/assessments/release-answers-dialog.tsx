"use client";

import { Bell, CheckCircle2, Clock3, Eye, ShieldAlert, Users } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";

type ReleaseAnswersDialogProps = {
  open: boolean;
  quizTitle: string;
  batchName: string;
  courseTitle?: string;
  submittedCount: number;
  rosterCount: number;
  pendingCount: number;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone: "slate" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <div className={`rounded-xl px-3.5 py-3 ring-1 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ReleaseAnswersDialog({
  open,
  quizTitle,
  batchName,
  courseTitle,
  submittedCount,
  rosterCount,
  pendingCount,
  busy = false,
  onClose,
  onConfirm,
}: ReleaseAnswersDialogProps) {
  const early = pendingCount > 0;

  return (
    <Dialog
      open={open}
      title={early ? "Release answers early?" : "Release answers to batch?"}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={onConfirm}>
            <Eye className="h-4 w-4" />
            {busy ? "Releasing…" : early ? "Release anyway" : "Show answers to batch"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 ring-1 ${
            early ? "bg-amber-50 ring-amber-200" : "bg-violet-50 ring-violet-200"
          }`}
        >
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              early ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-700"
            }`}
          >
            {early ? <ShieldAlert className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${early ? "text-amber-950" : "text-violet-950"}`}>
              {early
                ? `${pendingCount} trainee${pendingCount === 1 ? " has" : "s have"} not submitted yet`
                : "Everyone in this batch has submitted"}
            </p>
            <p className={`mt-1 text-sm ${early ? "text-amber-900/80" : "text-violet-900/80"}`}>
              {early
                ? "Submitted trainees will get access and a notification now. The others can review after they submit."
                : "Trainees will be notified and can review their answers, the correct answers, and marks together."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">{quizTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {batchName}
            {courseTitle ? ` · ${courseTitle}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <StatPill icon={Users} label="In batch" value={rosterCount} tone="slate" />
          <StatPill icon={CheckCircle2} label="Submitted" value={`${submittedCount}/${rosterCount}`} tone="emerald" />
          <StatPill icon={Clock3} label="Waiting" value={pendingCount} tone={pendingCount > 0 ? "amber" : "slate"} />
        </div>

        <ul className="space-y-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <span>Submitted trainees receive a notification that opens their marked answer review.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <span>They can see their answers, the correct answers, and marks for each question.</span>
          </li>
          {early ? (
            <li className="flex items-start gap-2.5">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>Trainees who have not submitted yet will unlock review after they finish the quiz.</span>
            </li>
          ) : null}
        </ul>
      </div>
    </Dialog>
  );
}
