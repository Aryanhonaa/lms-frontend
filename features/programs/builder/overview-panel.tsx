"use client";

import { useEffect, useState } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import type { CreateProgramInput, ProgramTree } from "@/types/program";
import type { Difficulty, TrainingMode } from "@/types/domain";
import { CARD, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";

type OverviewValues = {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  durationWeeks: number;
  trainingMode: TrainingMode;
  startDate: string;
  endDate: string;
};

function fromProgram(program: ProgramTree): OverviewValues {
  return {
    title: program.title,
    description: program.description,
    category: program.category,
    difficulty: program.difficulty,
    durationWeeks: program.durationWeeks,
    trainingMode: program.trainingMode,
    startDate: program.startDate ? program.startDate.slice(0, 10) : "",
    endDate: program.endDate ? program.endDate.slice(0, 10) : "",
  };
}

function toInput(values: OverviewValues): CreateProgramInput {
  const scheduled = values.trainingMode === "SCHEDULED";
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim() || "General",
    difficulty: values.difficulty,
    durationWeeks: values.durationWeeks > 0 ? values.durationWeeks : 4,
    trainingMode: values.trainingMode,
    startDate: scheduled ? values.startDate || null : null,
    endDate: scheduled ? values.endDate || null : null,
  };
}

function Choice({
  selected,
  label,
  hint,
  disabled,
  onClick,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition duration-150 ${
        selected
          ? "border-violet-300 bg-violet-50 text-violet-900 ring-1 ring-violet-200"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </button>
  );
}

export function OverviewPanel({
  program,
  disabled,
  onSave,
  onContinue,
}: {
  program: ProgramTree;
  disabled: boolean;
  onSave: (values: CreateProgramInput) => Promise<void>;
  onContinue: () => void;
}) {
  const [values, setValues] = useState<OverviewValues>(() => fromProgram(program));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fromProgram(program)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== savedSnapshot;

  async function save(thenContinue = false) {
    const title = values.title.trim();
    if (!title) {
      setError("Give the program a title.");
      return;
    }
    const snapshot = JSON.stringify(values);
    const payload = toInput(values);
    setBusy(true);
    setError(null);
    try {
      await onSave(payload);
      setSavedSnapshot(snapshot);
      if (thenContinue) {
        onContinue();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!dirty || disabled) {
      return;
    }
    if (!values.title.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void save(false);
    }, 900);
    return () => window.clearTimeout(timer);
    // save is recreated; debounce only on values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, dirty, disabled]);

  return (
    <div className="lms-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Create your program</h2>
        <p className="mt-1 text-sm text-slate-500">Start with the basics. You can add weeks and lessons next.</p>
      </div>

      <section className={`${CARD} space-y-5 p-6`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Program details</h3>
          <p className="mt-0.5 text-xs text-slate-500">This is what trainees see first.</p>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-800">
            Program title
            <RequiredMark />
          </span>
          <input
            className={fieldClass}
            value={values.title}
            disabled={disabled || busy}
            placeholder="Cybersecurity Fundamentals"
            onChange={(event) => setValues({ ...values, title: event.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-800">Tell trainees what they&apos;ll learn</span>
          <textarea
            className={fieldClass}
            rows={4}
            value={values.description}
            disabled={disabled || busy}
            placeholder="A practical introduction to the skills this program covers…"
            onChange={(event) => setValues({ ...values, description: event.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-800">Category</span>
          <input
            className={fieldClass}
            value={values.category}
            disabled={disabled || busy}
            placeholder="Cybersecurity"
            onChange={(event) => setValues({ ...values, category: event.target.value })}
          />
        </label>
      </section>

      <section className={`${CARD} space-y-5 p-6`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Program format</h3>
          <p className="mt-0.5 text-xs text-slate-500">Defaults are Beginner and Progression. Change them if you need to.</p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800">Difficulty</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Choice selected={values.difficulty === "BEGINNER"} label="Beginner" hint="No prior experience" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "BEGINNER" })} />
            <Choice selected={values.difficulty === "INTERMEDIATE"} label="Intermediate" hint="Some background" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "INTERMEDIATE" })} />
            <Choice selected={values.difficulty === "ADVANCED"} label="Advanced" hint="For experienced learners" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "ADVANCED" })} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800">Training mode</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              selected={values.trainingMode === "PROGRESSION"}
              label="Progression"
              hint="Trainees unlock the next day as they complete work"
              disabled={disabled}
              onClick={() => setValues({ ...values, trainingMode: "PROGRESSION", startDate: "", endDate: "" })}
            />
            <Choice
              selected={values.trainingMode === "SCHEDULED"}
              label="Scheduled"
              hint="Content follows calendar dates"
              disabled={disabled}
              onClick={() => setValues({ ...values, trainingMode: "SCHEDULED" })}
            />
          </div>
        </div>
        <label className="grid max-w-xs gap-1.5 text-sm">
          <span className="font-medium text-slate-800">Duration</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className={`${fieldClass} w-24`}
              value={values.durationWeeks}
              disabled={disabled || busy}
              onChange={(event) => setValues({ ...values, durationWeeks: Number(event.target.value) || 1 })}
            />
            <span className="text-slate-500">weeks</span>
          </span>
        </label>
      </section>

      {values.trainingMode === "SCHEDULED" ? (
        <section className={`${CARD} space-y-5 p-6`}>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
            <p className="mt-0.5 text-xs text-slate-500">When this program starts and ends for trainees.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">Start date</span>
              <input
                type="date"
                className={fieldClass}
                value={values.startDate}
                disabled={disabled || busy}
                onChange={(event) => setValues({ ...values, startDate: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">End date</span>
              <input
                type="date"
                className={fieldClass}
                value={values.endDate}
                disabled={disabled || busy}
                onChange={(event) => setValues({ ...values, endDate: event.target.value })}
              />
            </label>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={secondaryButtonClass} disabled={disabled || busy || !dirty} onClick={() => void save(false)}>
          {busy ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className={primaryButtonClass} disabled={disabled || busy} onClick={() => void save(true)}>
          Continue
        </button>
      </div>
    </div>
  );
}
