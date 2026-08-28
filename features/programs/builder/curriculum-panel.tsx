"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { dayItemCount } from "@/features/programs/builder/completion";
import { CARD, dangerButtonClass, fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { InlineTitle } from "@/components/ui/inline-title";
import { RequiredMark } from "@/components/ui/required-mark";
import type { ProgramTree, Week } from "@/types/program";

export function CurriculumPanel({
  program,
  editable,
  busy,
  collapsed,
  onToggle,
  onRenameWeek,
  onRenameDay,
  onDeleteWeek,
  onDeleteDay,
  onAddWeek,
  onAddDay,
  onOpenDay,
  onAddWeeklyQuiz,
  onAddWeeklyExam,
}: {
  program: ProgramTree;
  editable: boolean;
  busy: boolean;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onRenameWeek: (id: string, title: string) => Promise<void>;
  onRenameDay: (id: string, title: string) => Promise<void>;
  onDeleteWeek: (id: string) => void;
  onDeleteDay: (id: string) => void;
  onAddWeek: (input: { title: string; description?: string }) => Promise<void>;
  onAddDay: (weekId: string, title: string) => Promise<void>;
  onOpenDay: (dayId: string) => void;
  onAddWeeklyQuiz: (weekId: string) => void;
  onAddWeeklyExam: (weekId: string) => void;
}) {
  const [addingWeek, setAddingWeek] = useState(false);
  const [addingDayFor, setAddingDayFor] = useState<string | null>(null);

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Your program</h2>
          <p className="mt-1 text-sm text-slate-500">Build the path week by week. Open a day to add lessons and activities.</p>
        </div>
        {editable && program.weeks.length > 0 ? (
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => setAddingWeek(true)}>
            <Plus className="h-4 w-4" />
            Add week
          </button>
        ) : null}
      </div>

      {program.weeks.length === 0 && !addingWeek ? (
        <div className={`${CARD} px-6 py-12 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <BookOpen className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Your curriculum is empty</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Start the learning journey by adding your first week. You can add days and content right after.
          </p>
          {editable ? (
            <button type="button" className={`${primaryButtonClass} mt-5`} onClick={() => setAddingWeek(true)}>
              <Plus className="h-4 w-4" />
              Add first week
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {program.weeks.map((week, weekIndex) => (
          <WeekCard
            key={week.id}
            week={week}
            weekIndex={weekIndex}
            collapsed={Boolean(collapsed[week.id])}
            editable={editable}
            busy={busy}
            addingDay={addingDayFor === week.id}
            onToggle={() => onToggle(week.id)}
            onRename={(title) => onRenameWeek(week.id, title)}
            onDelete={() => onDeleteWeek(week.id)}
            onOpenDay={onOpenDay}
            onRenameDay={onRenameDay}
            onDeleteDay={onDeleteDay}
            onStartAddDay={() => setAddingDayFor(week.id)}
            onCancelAddDay={() => setAddingDayFor(null)}
            onAddDay={async (title) => {
              await onAddDay(week.id, title);
              setAddingDayFor(null);
            }}
            onAddWeeklyQuiz={() => onAddWeeklyQuiz(week.id)}
            onAddWeeklyExam={() => onAddWeeklyExam(week.id)}
          />
        ))}
      </div>

      {addingWeek && editable ? (
        <InlineCreate
          title="New week"
          placeholder="Network Security"
          descriptionPlaceholder="What trainees will learn this week (optional)"
          submitLabel="Add week"
          busy={busy}
          onCancel={() => setAddingWeek(false)}
          onSubmit={async (title, description) => {
            await onAddWeek({ title, description });
            setAddingWeek(false);
          }}
        />
      ) : null}
    </div>
  );
}

function WeekCard({
  week,
  weekIndex,
  collapsed,
  editable,
  busy,
  addingDay,
  onToggle,
  onRename,
  onDelete,
  onOpenDay,
  onRenameDay,
  onDeleteDay,
  onStartAddDay,
  onCancelAddDay,
  onAddDay,
  onAddWeeklyQuiz,
  onAddWeeklyExam,
}: {
  week: Week;
  weekIndex: number;
  collapsed: boolean;
  editable: boolean;
  busy: boolean;
  addingDay: boolean;
  onToggle: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => void;
  onOpenDay: (dayId: string) => void;
  onRenameDay: (id: string, title: string) => Promise<void>;
  onDeleteDay: (id: string) => void;
  onStartAddDay: () => void;
  onCancelAddDay: () => void;
  onAddDay: (title: string) => Promise<void>;
  onAddWeeklyQuiz: () => void;
  onAddWeeklyExam: () => void;
}) {
  const hasWeeklyQuiz = week.quizzes.some((item) => item.kind === "WEEKLY_QUIZ");
  const hasWeeklyExam = week.quizzes.some((item) => item.kind === "WEEKLY_EXAM");

  return (
    <article className={CARD}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" className={ghostButtonClass} onClick={onToggle} aria-expanded={!collapsed}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="sr-only">{collapsed ? "Expand" : "Collapse"} week</span>
        </button>
        <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">Week {weekIndex + 1}</span>
        <div className="min-w-0 flex-1">
          <InlineTitle as="h3" value={week.title} disabled={!editable || busy} onSave={onRename} />
        </div>
        {editable ? (
          <button type="button" className={dangerButtonClass} disabled={busy} onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
      {week.description ? <p className="px-4 pb-2 text-sm text-slate-500">{week.description}</p> : null}
      {collapsed ? null : (
        <div className="border-t border-slate-100 px-4 py-3">
          {week.days.length === 0 && !addingDay ? (
            <p className="mb-3 text-sm text-slate-500">No days yet. Add a day, then open it to drop in lessons.</p>
          ) : null}
          <ul className="space-y-1">
            {week.days.map((day, dayIndex) => {
              const count = dayItemCount(day);
              return (
                <li key={day.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50">
                  <span className="w-14 shrink-0 text-xs font-medium tracking-wide text-slate-400 uppercase">Day {dayIndex + 1}</span>
                  <div className="min-w-0 flex-1">
                    <InlineTitle as="p" value={day.title} disabled={!editable || busy} onSave={(title) => onRenameDay(day.id, title)} />
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    {count === 0 ? "Empty" : `${count} item${count === 1 ? "" : "s"}`}
                  </span>
                  <button type="button" className={secondaryButtonClass} onClick={() => onOpenDay(day.id)}>
                    Open
                  </button>
                  {editable ? (
                    <button type="button" className={dangerButtonClass} disabled={busy} onClick={() => onDeleteDay(day.id)}>
                      Delete
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {addingDay && editable ? (
            <div className="mt-3">
              <InlineCreate
                title="New day"
                placeholder="Introduction to Firewalls"
                submitLabel="Add day"
                busy={busy}
                onCancel={onCancelAddDay}
                onSubmit={async (title) => {
                  await onAddDay(title);
                }}
              />
            </div>
          ) : editable ? (
            <button type="button" className={`${ghostButtonClass} mt-2`} disabled={busy} onClick={onStartAddDay}>
              <Plus className="h-4 w-4" />
              Add day
            </button>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {!hasWeeklyQuiz && editable ? (
              <button type="button" className={ghostButtonClass} onClick={onAddWeeklyQuiz}>
                + Weekly quiz
              </button>
            ) : null}
            {!hasWeeklyExam && editable ? (
              <button type="button" className={ghostButtonClass} onClick={onAddWeeklyExam}>
                + Weekly exam
              </button>
            ) : null}
            {week.quizzes.map((quiz) => (
              <span key={quiz.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {quiz.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function InlineCreate({
  title,
  placeholder,
  descriptionPlaceholder,
  submitLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  descriptionPlaceholder?: string;
  submitLabel: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (title: string, description?: string) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className={`${CARD} grid gap-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const nextTitle = String(data.get("title") ?? "").trim();
        const description = String(data.get("description") ?? "").trim();
        if (!nextTitle) {
          setError("A title is required");
          return;
        }
        setPending(true);
        setError(null);
        void onSubmit(nextTitle, description || undefined)
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Unable to add");
          })
          .finally(() => setPending(false));
      }}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-800">
          Title
          <RequiredMark />
        </span>
        <input name="title" className={fieldClass} placeholder={placeholder} autoFocus disabled={busy || pending} />
      </label>
      {descriptionPlaceholder ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Description</span>
          <textarea name="description" rows={2} className={fieldClass} placeholder={descriptionPlaceholder} disabled={busy || pending} />
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={primaryButtonClass} disabled={busy || pending}>
          {pending ? "Adding…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
