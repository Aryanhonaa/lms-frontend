"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDashed,
  FileText,
  GraduationCap,
  Layers3,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import { dayItemCount } from "@/features/programs/builder/completion";
import { ActionMenu } from "@/features/programs/builder/chrome";
import { CARD, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import { InlineTitle } from "@/components/ui/inline-title";
import type { Day, ProgramTree, Week } from "@/types/program";

type FlatDay = {
  day: Day;
  week: Week;
  number: number;
};

function flattenDays(program: ProgramTree): FlatDay[] {
  const rows: FlatDay[] = [];
  let number = 1;
  for (const week of program.weeks) {
    for (const day of week.days) {
      rows.push({ day, week, number });
      number += 1;
    }
  }
  return rows;
}

export function CurriculumPanel({
  program,
  editable,
  busy,
  onRenameDay,
  onDeleteDay,
  onAddDay,
  onOpenDay,
  onAddFinalExam,
}: {
  program: ProgramTree;
  editable: boolean;
  busy: boolean;
  collapsed?: Record<string, boolean>;
  onToggle?: (id: string) => void;
  onRenameWeek?: (id: string, title: string) => Promise<void>;
  onRenameDay: (id: string, title: string) => Promise<void>;
  onDeleteWeek?: (id: string) => void;
  onDeleteDay: (id: string) => void;
  onAddWeek: (input: { title: string; description?: string }) => Promise<void>;
  onAddDay: (weekId: string, title: string) => Promise<void>;
  onOpenDay: (dayId: string) => void;
  onAddWeeklyQuiz?: (weekId: string) => void;
  onAddFinalExam: () => void;
}) {
  const days = flattenDays(program);
  const lastWeek = program.weeks[program.weeks.length - 1] ?? null;
  const [adding, setAdding] = useState(false);
  const finalExams = program.quizzes.filter((quiz) => quiz.kind === "FINAL_EXAM");
  const canAddFinalExam = editable && finalExams.length === 0;
  const contentCount = days.reduce((sum, row) => sum + dayItemCount(row.day), 0);
  const readyDays = days.filter((row) => dayItemCount(row.day) > 0).length;

  async function addDay(title: string) {
    await onAddDay(lastWeek?.id ?? "", title);
    setAdding(false);
  }

  return (
    <div className="lms-fade-up mx-auto max-w-4xl space-y-6">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#18152b] px-5 py-6 text-white shadow-[0_24px_70px_rgba(66,47,138,0.24)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-violet-100 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Learning journey
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Build the flow.</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-violet-100/70">
              Shape the order trainees move through. Every day is a chapter—fill it with lessons, videos, activities, and files.
            </p>
          </div>
          {editable && days.length > 0 && !adding ? (
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#211a42] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4" />
              Add a day
            </button>
          ) : null}
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          {[
            { value: days.length, label: "Days" },
            { value: contentCount, label: "Content" },
            { value: `${readyDays}/${days.length || 0}`, label: "Ready" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur-sm">
              <p className="text-lg font-semibold tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-medium tracking-wider text-violet-200/60 uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {days.length === 0 && !adding ? (
        <div className={`${CARD} relative overflow-hidden px-6 py-16 text-center`}>
          <div className="pointer-events-none absolute inset-x-16 top-0 h-24 rounded-full bg-violet-100/70 blur-3xl" />
          <span className="relative mx-auto flex h-14 w-14 rotate-3 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300">
            <BookOpen className="h-6 w-6" />
          </span>
          <h3 className="relative mt-5 text-lg font-semibold tracking-tight text-slate-900">Your journey starts here</h3>
          <p className="relative mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Create day one, then make it memorable with lessons, media, and hands-on activities.</p>
          {editable ? (
            <button
              type="button"
              className={`${primaryButtonClass} relative mt-5`}
              disabled={busy}
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4" />
              Add first day
            </button>
          ) : null}
        </div>
      ) : null}

      {days.length > 0 ? (
        <article>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-violet-600 uppercase">Program timeline</p>
              <p className="mt-0.5 text-sm text-slate-500">From first touch to final checkpoint.</p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
              <Check className="h-3.5 w-3.5" />
              {readyDays} day{readyDays === 1 ? "" : "s"} ready
            </span>
          </div>
          <ul className="relative space-y-3 before:absolute before:top-8 before:bottom-8 before:left-[1.65rem] before:w-px before:bg-gradient-to-b before:from-violet-300 before:via-violet-200 before:to-slate-200 sm:before:left-[2.15rem]">
            {days.map((row) => {
              const count = dayItemCount(row.day);
              const hasContent = count > 0;
              return (
                <li
                  key={row.day.id}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-[1.4rem] border border-white bg-white/90 p-3.5 shadow-[0_8px_30px_rgba(51,41,90,0.06)] ring-1 ring-slate-900/[0.04] transition duration-200 hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-[0_16px_40px_rgba(82,61,153,0.12)] sm:gap-4 sm:p-4"
                >
                  <span
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm transition group-hover:rotate-3 sm:h-12 sm:w-12 ${
                      hasContent ? "bg-violet-600 text-white shadow-violet-200" : "bg-violet-50 text-violet-600 ring-1 ring-violet-100"
                    }`}
                  >
                    {String(row.number).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <InlineTitle
                        as="p"
                        value={row.day.title}
                        disabled={!editable || busy}
                        onSave={(title) => onRenameDay(row.day.id, title)}
                      />
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        hasContent ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {hasContent ? <Check className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                        {hasContent ? "Ready" : "Draft"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                      {hasContent ? (
                        <>
                          <span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{count} item{count === 1 ? "" : "s"}</span>
                          <span aria-hidden>·</span>
                          <span className="hidden items-center gap-1 sm:flex"><Play className="h-3.5 w-3.5" />Learning content</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Waiting for its first idea</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-sm font-semibold transition duration-150 sm:px-3 ${
                      !hasContent && editable ? "bg-violet-50 text-violet-700 hover:bg-violet-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => onOpenDay(row.day.id)}
                  >
                    <span className="hidden sm:inline">{!editable ? "View content" : !hasContent ? "Add content" : "Edit"}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {editable ? (
                    <ActionMenu
                      label={`Actions for ${row.day.title}`}
                      items={[{ label: "Delete", danger: true, disabled: busy, onClick: () => onDeleteDay(row.day.id) }]}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {adding && editable ? (
            <div className="mt-3">
              <DayCreateRow
                nextNumber={days.length + 1}
                busy={busy}
                onCancel={() => setAdding(false)}
                onSubmit={addDay}
              />
            </div>
          ) : null}
          {canAddFinalExam || finalExams.length > 0 ? (
            <div className="relative mt-3 overflow-hidden rounded-[1.4rem] border border-violet-200/70 bg-violet-50 p-4 sm:p-5">
              <div className="pointer-events-none absolute -top-10 right-4 h-24 w-24 rounded-full bg-fuchsia-200/60 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#211a42] text-violet-100 shadow-lg shadow-violet-200">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-violet-500 uppercase">Final checkpoint</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                    {finalExams[0]?.title ?? "Wrap it up with a final exam"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {finalExams.length > 0 ? "Your closing assessment is ready." : "Optional, but perfect for testing the full journey."}
                  </p>
                </div>
                {canAddFinalExam ? (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:-translate-y-0.5 hover:shadow-md"
                    onClick={onAddFinalExam}
                  >
                    <span className="hidden sm:inline">Add exam</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Added</span>
                )}
              </div>
            </div>
          ) : null}
        </article>
      ) : adding && editable ? (
        <article className={CARD}>
          <div className="px-4 py-3">
            <DayCreateRow
              nextNumber={1}
              busy={busy}
              onCancel={() => setAdding(false)}
              onSubmit={addDay}
            />
          </div>
        </article>
      ) : null}
    </div>
  );
}

function DayCreateRow({
  nextNumber,
  busy,
  onCancel,
  onSubmit,
}: {
  nextNumber: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (title: string) => Promise<void>;
}) {
  const suggested = `Day ${nextNumber}`;
  const [title, setTitle] = useState(suggested);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    const nextTitle = title.trim() || suggested;
    setPending(true);
    setError(null);
    try {
      await onSubmit(nextTitle);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add day");
    } finally {
      setPending(false);
    }
  }

  const locked = busy || pending;

  return (
    <form
      className="rounded-[1.4rem] border border-violet-200 bg-white p-4 shadow-[0_12px_35px_rgba(82,61,153,0.1)]"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">{nextNumber}</span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Name your next chapter</p>
          <p className="text-xs text-slate-500">Keep the suggestion or make it yours.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={fieldClass}
          value={title}
          autoFocus
          disabled={locked}
          onChange={(event) => setTitle(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="flex shrink-0 justify-end gap-2">
          <button type="button" className={secondaryButtonClass} disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={locked}>
            {pending ? "Adding…" : "Add day"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
