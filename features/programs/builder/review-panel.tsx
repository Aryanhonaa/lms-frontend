"use client";

import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { ProgramPreview } from "@/features/programs/program-preview";
import type { BuilderSection, SectionStatus } from "@/features/programs/builder/completion";
import { analyzeBuilder } from "@/features/programs/builder/completion";
import { CARD, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { programStatusLabel } from "@/lib/programs/enrollment";
import type { ProgramTree } from "@/types/program";

const CHECKS: Array<{ id: BuilderSection; label: string; completeText: string; attentionText: string; emptyText: string }> = [
  {
    id: "overview",
    label: "Overview",
    completeText: "Title and description are in place.",
    attentionText: "Add a short description so trainees know what they will learn.",
    emptyText: "Give the program a title.",
  },
  {
    id: "curriculum",
    label: "Curriculum",
    completeText: "Weeks and days are ready.",
    attentionText: "You have a week. Add at least one day so content has a home.",
    emptyText: "Add your first week.",
  },
  {
    id: "content",
    label: "Content",
    completeText: "Learning materials are attached to days.",
    attentionText: "Days exist, but none have lessons, videos, or resources yet.",
    emptyText: "Add a day, then drop in a lesson or video.",
  },
  {
    id: "assessments",
    label: "Assessments",
    completeText: "Quizzes, exams, or assignments are in the program.",
    attentionText: "Optional — add a quiz or assignment when you are ready.",
    emptyText: "Optional — not required to submit.",
  },
  {
    id: "review",
    label: "Ready to send",
        completeText: "At least one week exists. You can send this course for review.",
        attentionText: "Almost there.",
        emptyText: "Add at least one week before sending for review.",
  },
];

export function ReviewPanel({
  program,
  editable,
  busy,
  onGo,
  onSubmit,
}: {
  program: ProgramTree;
  editable: boolean;
  busy: boolean;
  onGo: (section: BuilderSection) => void;
  onSubmit: () => void;
}) {
  const analysis = analyzeBuilder(program);

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Review & send</h2>
        <p className="mt-1 text-sm text-slate-500">
          Check what is done, preview the trainee path, then send for review when you are ready.
        </p>
      </div>

      <section className={`${CARD} divide-y divide-slate-100`}>
        {CHECKS.map((item) => {
          const status = analysis.statuses[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start gap-3 px-5 py-4 text-left transition duration-150 hover:bg-slate-50"
              onClick={() => onGo(item.id === "review" ? "curriculum" : item.id)}
            >
              <StatusIcon status={status} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  {status === "complete" ? item.completeText : status === "attention" || status === "optional" ? item.attentionText : item.emptyText}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      {analysis.submitHint ? <p className="text-sm text-amber-700">{analysis.submitHint}</p> : null}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} disabled={busy || !analysis.canSubmit} onClick={onSubmit}>
            {busy ? "Sending…" : "Send for Review"}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => onGo("curriculum")}>
            Back to curriculum
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">This program is {programStatusLabel(program.status)}. Editing is locked until it returns to draft.</p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Trainee preview</h3>
        <div className={`${CARD} overflow-hidden p-1`}>
          <ProgramPreview program={program} />
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete") {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />;
  }
  if (status === "attention") {
    return <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />;
  }
  return <Circle className="mt-0.5 h-5 w-5 text-slate-300" />;
}
