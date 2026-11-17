"use client";

import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { ProgramPreview } from "@/features/programs/program-preview";
import type { BuilderSection, SectionStatus } from "@/features/programs/builder/completion";
import { analyzeBuilder } from "@/features/programs/builder/completion";
import { CARD } from "@/features/programs/builder/ui";
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
    label: "Days",
    completeText: "Days are ready.",
    attentionText: "Add at least one day so content has a home.",
    emptyText: "Add your first day.",
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
  onGo,
}: {
  program: ProgramTree;
  editable: boolean;
  onGo: (section: BuilderSection) => void;
}) {
  const analysis = analyzeBuilder(program);

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Review</h2>
        <p className="mt-1 text-sm text-slate-500">Check the program, then send it from the top bar.</p>
      </div>

      <section className={`${CARD} divide-y divide-slate-100`}>
        {CHECKS.map((item) => {
          const status = analysis.statuses[item.id];
          return (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
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

      {editable ? null : (
        <p className="text-sm text-slate-500">This program is {programStatusLabel(program.status)}, so the builder is read-only.</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Trainee preview</h3>
        <div className={`${CARD} overflow-hidden`}>
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
