"use client";

import type { ReactNode } from "react";
import { ClipboardCheck, ListChecks } from "lucide-react";
import { collectAssignments, collectQuizzes, isExamKind, linkedFileTitle } from "@/features/programs/builder/completion";
import { ActionMenu } from "@/features/programs/builder/chrome";
import { CARD, ghostButtonClass } from "@/features/programs/builder/ui";
import type { ProgramTree, Quiz } from "@/types/program";

export function AssessmentsPanel({
  program,
  editable,
  busy,
  onOpenDay,
  onAddPracticeFromHint,
  onAddFinalExam,
  onEditQuiz,
  onDeleteQuiz,
  onDeleteAssignment,
}: {
  program: ProgramTree;
  editable: boolean;
  busy: boolean;
  onOpenDay: (dayId: string) => void;
  onAddPracticeFromHint: () => void;
  onAddFinalExam: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string) => void;
  onDeleteAssignment: (id: string) => void;
}) {
  const assignments = collectAssignments(program);
  const quizzes = collectQuizzes(program);
  const practice = quizzes.filter((item) => item.kind === "PRACTICE_QUIZ");
  const weekly = quizzes.filter((item) => item.kind === "WEEKLY_QUIZ");
  const exams = quizzes.filter((item) => isExamKind(item.kind));

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Assessments</h2>
        <p className="mt-1 text-sm text-slate-500">Quizzes and assignments live on a day. Exams are optional.</p>
      </div>

      <section className={CARD}>
        <Header
          title="Assignments"
          count={assignments.length}
          action={
            editable ? (
              <button type="button" className={ghostButtonClass} onClick={onAddPracticeFromHint}>
                Add on a day
              </button>
            ) : null
          }
        />
        {assignments.length === 0 ? (
          <Empty text="No assignments yet. Open a day and add one as an activity." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {assignments.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpenDay(item.dayId)}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.weekTitle ? `${item.weekTitle} · ${item.dayTitle}` : item.dayTitle}
                      {linkedFileTitle(program, item.linkedItemType, item.linkedItemId)
                        ? ` · after ${linkedFileTitle(program, item.linkedItemType, item.linkedItemId)}`
                        : ""}
                    </span>
                  </span>
                </button>
                {editable ? (
                  <ActionMenu
                    label={`Actions for ${item.title}`}
                    items={[{ label: "Delete", danger: true, disabled: busy, onClick: () => onDeleteAssignment(item.id) }]}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={CARD}>
        <Header title="Quizzes" count={practice.length + weekly.length} />
        {practice.length + weekly.length === 0 ? (
          <Empty text="No quizzes yet. Open a day and add a practice quiz." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {practice.concat(weekly).map((item) => (
              <QuizRow
                key={item.id}
                title={item.title}
                scope={item.scope}
                kind={item.kind}
                writtenCount={item.questions.filter((question) => question.type === "WRITTEN").length}
                editable={editable}
                busy={busy}
                onEdit={() => onEditQuiz(item)}
                onDelete={() => onDeleteQuiz(item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={CARD}>
        <Header
          title="Exams"
          count={exams.length}
          action={
            editable && program.quizzes.length === 0 ? (
              <button type="button" className={ghostButtonClass} onClick={onAddFinalExam}>
                Final exam
              </button>
            ) : null
          }
        />
        {exams.length === 0 ? (
          <Empty text="A final exam is optional. Add one when the program needs a closing gate." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {exams.map((item) => (
              <QuizRow
                key={item.id}
                title={item.title}
                scope={item.scope}
                kind={item.kind}
                writtenCount={item.questions.filter((question) => question.type === "WRITTEN").length}
                editable={editable}
                busy={busy}
                onEdit={() => onEditQuiz(item)}
                onDelete={() => onDeleteQuiz(item.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Header({ title, count, action }: { title: string; count: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-900">
        {title}
        <span className="ml-2 text-xs font-medium text-slate-400">{count}</span>
      </h3>
      {action}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 pb-4 text-sm text-slate-500">{text}</p>;
}

function QuizRow({
  title,
  scope,
  kind,
  writtenCount,
  editable,
  busy,
  onEdit,
  onDelete,
}: {
  title: string;
  scope: string;
  kind: string;
  writtenCount: number;
  editable: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        <ClipboardCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
          {title}
          {writtenCount > 0 ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
              {writtenCount} written
            </span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">
          {kind.replaceAll("_", " ").toLowerCase()} · {scope}
        </p>
      </div>
      {editable ? (
        <ActionMenu
          label={`Actions for ${title}`}
          items={[
            { label: "Edit", disabled: busy, onClick: onEdit },
            { label: "Delete", danger: true, disabled: busy, onClick: onDelete },
          ]}
        />
      ) : null}
    </li>
  );
}
