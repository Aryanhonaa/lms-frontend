"use client";

import type { ReactNode } from "react";
import { ClipboardCheck, ListChecks, Plus, Trophy } from "lucide-react";
import { collectAssignments, collectQuizzes, isExamKind, linkedFileTitle } from "@/features/programs/builder/completion";
import { CARD, dangerButtonClass, fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { QuizForm } from "@/features/programs/quiz-form";
import { RequiredMark } from "@/components/ui/required-mark";
import type { ProgramTree, QuizInput } from "@/types/program";

export function AssessmentsPanel({
  program,
  editable,
  busy,
  onOpenDay,
  onAddPracticeFromHint,
  onAddWeeklyQuiz,
  onAddWeeklyExam,
  onAddFinalExam,
  onAddMilestone,
  onAddMilestoneExam,
  onAddRequirement,
  onDeleteQuiz,
  onDeleteAssignment,
  onDeleteMilestone,
  onDeleteRequirement,
}: {
  program: ProgramTree;
  editable: boolean;
  busy: boolean;
  onOpenDay: (dayId: string) => void;
  onAddPracticeFromHint: () => void;
  onAddWeeklyQuiz: (weekId: string) => void;
  onAddWeeklyExam: (weekId: string) => void;
  onAddFinalExam: () => void;
  onAddMilestone: (input: { title: string; afterWeekIndex: number }) => Promise<void>;
  onAddMilestoneExam: (milestoneId: string, input: QuizInput) => Promise<void>;
  onAddRequirement: (
    milestoneId: string,
    input: { label: string; kind?: "WEEKS_COMPLETED" | "ASSESSMENTS_PASSED" | "ASSIGNMENTS_COMPLETE" | "ATTENDANCE" | "CUSTOM"; targetCount?: number },
  ) => Promise<void>;
  onDeleteQuiz: (id: string) => void;
  onDeleteAssignment: (id: string) => void;
  onDeleteMilestone: (id: string) => void;
  onDeleteRequirement: (id: string) => void;
}) {
  const assignments = collectAssignments(program);
  const quizzes = collectQuizzes(program);
  const practice = quizzes.filter((item) => item.kind === "PRACTICE_QUIZ");
  const weekly = quizzes.filter((item) => item.kind === "WEEKLY_QUIZ");
  const exams = quizzes.filter((item) => isExamKind(item.kind));

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Assessments</h2>
        <p className="mt-1 text-sm text-slate-500">
          Assignments and practice quizzes live on a day. Weekly and final exams sit on the week or program.
        </p>
      </div>

      <section className={CARD}>
        <Header
          title="Assignments"
          count={assignments.length}
          action={
            editable ? (
              <button type="button" className={ghostButtonClass} onClick={onAddPracticeFromHint}>
                <Plus className="h-4 w-4" />
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
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <ListChecks className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.weekTitle} · {item.dayTitle}
                    {linkedFileTitle(program, item.linkedItemType, item.linkedItemId)
                      ? ` · after ${linkedFileTitle(program, item.linkedItemType, item.linkedItemId)}`
                      : ""}
                  </p>
                </div>
                <button type="button" className={secondaryButtonClass} onClick={() => onOpenDay(item.dayId)}>
                  Open day
                </button>
                {editable ? (
                  <button type="button" className={dangerButtonClass} disabled={busy} onClick={() => onDeleteAssignment(item.id)}>
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={CARD}>
        <Header title="Quizzes" count={practice.length + weekly.length} />
        {practice.length + weekly.length === 0 ? (
          <Empty text="No quizzes yet. Add a practice quiz on a day, or a weekly quiz on a week." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {practice.concat(weekly).map((item) => (
              <QuizRow key={item.id} title={item.title} scope={item.scope} kind={item.kind} editable={editable} busy={busy} onDelete={() => onDeleteQuiz(item.id)} />
            ))}
          </ul>
        )}
        {editable && program.weeks.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
            {program.weeks.map((week, index) =>
              week.quizzes.some((item) => item.kind === "WEEKLY_QUIZ") ? null : (
                <button key={week.id} type="button" className={ghostButtonClass} onClick={() => onAddWeeklyQuiz(week.id)}>
                  + Week {index + 1} quiz
                </button>
              ),
            )}
          </div>
        ) : null}
      </section>

      <section className={CARD}>
        <Header
          title="Exams"
          count={exams.length}
          action={
            editable && program.quizzes.length === 0 ? (
              <button type="button" className={primaryButtonClass} onClick={onAddFinalExam}>
                <Plus className="h-4 w-4" />
                Final exam
              </button>
            ) : null
          }
        />
        {exams.length === 0 ? (
          <Empty text="Exams are optional. Add a weekly exam or a final exam when the program needs a checkpoint." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {exams.map((item) => (
              <QuizRow key={item.id} title={item.title} scope={item.scope} kind={item.kind} editable={editable} busy={busy} onDelete={() => onDeleteQuiz(item.id)} />
            ))}
          </ul>
        )}
        {editable ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
            {program.weeks.map((week, index) =>
              week.quizzes.some((item) => item.kind === "WEEKLY_EXAM") ? null : (
                <button key={week.id} type="button" className={ghostButtonClass} onClick={() => onAddWeeklyExam(week.id)}>
                  + Week {index + 1} exam
                </button>
              ),
            )}
          </div>
        ) : null}
      </section>

      <section className={CARD}>
        <Header
          title="Milestones"
          count={program.milestones.length}
        />
        {program.milestones.length === 0 ? (
          <Empty text="Milestones are optional checkpoints after a week. They use the existing milestone engine." />
        ) : (
          <div className="divide-y divide-slate-100">
            {program.milestones.map((milestone) => (
              <article key={milestone.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-violet-600" />
                  <p className="flex-1 text-sm font-medium text-slate-900">
                    {milestone.title} · after week {milestone.afterWeekIndex + 1}
                  </p>
                  {editable ? (
                    <button type="button" className={dangerButtonClass} disabled={busy} onClick={() => onDeleteMilestone(milestone.id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {milestone.requirements.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.label}
                        {item.kind !== "CUSTOM" ? ` · ${item.kind.replaceAll("_", " ").toLowerCase()}` : ""}
                      </span>
                      {editable ? (
                        <button type="button" className={ghostButtonClass} onClick={() => onDeleteRequirement(item.id)}>
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {editable ? (
                  <form
                    className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_88px_auto]"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      const label = String(data.get("label") ?? "").trim();
                      if (!label) {
                        return;
                      }
                      void onAddRequirement(milestone.id, {
                        label,
                        kind: String(data.get("kind") ?? "CUSTOM") as "WEEKS_COMPLETED" | "ASSESSMENTS_PASSED" | "ASSIGNMENTS_COMPLETE" | "ATTENDANCE" | "CUSTOM",
                        targetCount: Number(data.get("targetCount") ?? 1) || 1,
                      });
                      event.currentTarget.reset();
                    }}
                  >
                    <label className="grid gap-1 text-sm sm:col-span-1">
                      <span className="font-medium text-slate-800">
                        Requirement
                        <RequiredMark />
                      </span>
                      <input name="label" className={fieldClass} placeholder="Requirement" />
                    </label>
                    <select name="kind" className={fieldClass} defaultValue="CUSTOM">
                      <option value="CUSTOM">Other</option>
                      <option value="WEEKS_COMPLETED">Weeks completed</option>
                      <option value="ASSESSMENTS_PASSED">Assessments passed</option>
                      <option value="ASSIGNMENTS_COMPLETE">Assignments complete</option>
                      <option value="ATTENDANCE">Attendance</option>
                    </select>
                    <input name="targetCount" type="number" min={1} defaultValue={1} className={fieldClass} />
                    <button type="submit" className={secondaryButtonClass}>
                      Add
                    </button>
                  </form>
                ) : null}
                {milestone.exam ? (
                  <p className="mt-2 text-sm text-slate-600">Exam: {milestone.exam.title}</p>
                ) : editable ? (
                  <div className="mt-3">
                    <QuizForm submitLabel="Add milestone exam" disabled={busy} onSubmit={(input) => onAddMilestoneExam(milestone.id, input)} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
        {editable ? (
          <form
            className="grid gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_140px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const title = String(data.get("title") ?? "").trim();
              if (!title) {
                return;
              }
              void onAddMilestone({
                title,
                afterWeekIndex: Math.max(0, Number(data.get("afterWeekIndex") ?? 0)),
              });
              event.currentTarget.reset();
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">
                Milestone title
                <RequiredMark />
              </span>
              <input name="title" className={fieldClass} placeholder="Milestone title" disabled={busy} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">After week</span>
              <input name="afterWeekIndex" type="number" min={0} defaultValue={0} className={fieldClass} disabled={busy} />
            </label>
            <button type="submit" className={secondaryButtonClass} disabled={busy}>
              Add milestone
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function Header({ title, count, action }: { title: string; count: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <h3 className="text-sm font-semibold text-slate-900">
        {title}
        <span className="ml-2 text-xs font-medium text-slate-400">{count}</span>
      </h3>
      {action}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 pb-5 text-sm text-slate-500">{text}</p>;
}

function QuizRow({
  title,
  scope,
  kind,
  editable,
  busy,
  onDelete,
}: {
  title: string;
  scope: string;
  kind: string;
  editable: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
        <ClipboardCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">
          {kind.replaceAll("_", " ").toLowerCase()} · {scope}
        </p>
      </div>
      {editable ? (
        <button type="button" className={dangerButtonClass} disabled={busy} onClick={onDelete}>
          Delete
        </button>
      ) : null}
    </li>
  );
}
