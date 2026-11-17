"use client";

import { useEffect, useRef, useState } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import type { CreateProgramInput, ProgramTree } from "@/types/program";
import type { Difficulty, TrainingMode } from "@/types/domain";
import { CARD, fieldClass } from "@/features/programs/builder/ui";

function courseType(category: string): "Sales" | "Files" | "Other" {
  const value = category.trim().toLowerCase();
  if (value === "sales") {
    return "Sales";
  }
  if (value === "files" || value === "file") {
    return "Files";
  }
  return "Other";
}

type OverviewValues = {
  title: string;
  description: string;
  category: "Sales" | "Files" | "Other";
  difficulty: Difficulty;
  trainingMode: TrainingMode;
  examScoreThreshold: number;
};

function fromProgram(program: ProgramTree): OverviewValues {
  return {
    title: program.title,
    description: program.description,
    category: courseType(program.category),
    difficulty: program.difficulty,
    trainingMode: program.trainingMode,
    examScoreThreshold: Number(program.examScoreThreshold ?? 60),
  };
}

function toInput(values: OverviewValues): CreateProgramInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    difficulty: values.difficulty,
    trainingMode: values.trainingMode,
    startDate: null,
    endDate: null,
    examScoreThreshold: values.examScoreThreshold,
  };
}

function Segment({
  selected,
  label,
  disabled,
  onClick,
}: {
  selected: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-center text-sm whitespace-nowrap transition duration-150 ${
        selected ? "bg-white font-medium text-violet-800 shadow-sm ring-1 ring-violet-100" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

export function OverviewPanel({
  program,
  disabled,
  continueRequest = 0,
  onSave,
  onContinue,
}: {
  program: ProgramTree;
  disabled: boolean;
  continueRequest?: number;
  onSave: (values: CreateProgramInput) => Promise<void>;
  onContinue: () => void;
}) {
  const [values, setValues] = useState<OverviewValues>(() => fromProgram(program));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fromProgram(program)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== savedSnapshot;
  const seenContinue = useRef(continueRequest);

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

  useEffect(() => {
    if (seenContinue.current === continueRequest) {
      return;
    }
    seenContinue.current = continueRequest;
    void save(true);
    // save closes over the latest values from this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continueRequest]);

  const modeHint =
    values.trainingMode === "SCHEDULED"
      ? "Trainees see day 1 on the batch start date, then the next day's content on the next calendar day."
      : "Trainees can open the next day's content as soon as they finish the current day — even on the same day.";

  return (
    <div className="lms-fade-up mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-slate-900">Overview</h2>
        <p className="mt-1 text-sm text-slate-500">What trainees see first. Changes save as you type.</p>
      </div>

      <section className={`${CARD} space-y-5 p-5 sm:p-6`}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            Title
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
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            className={fieldClass}
            rows={4}
            value={values.description}
            disabled={disabled || busy}
            placeholder="What this program covers…"
            onChange={(event) => setValues({ ...values, description: event.target.value })}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Type</span>
            <select
              className={fieldClass}
              value={values.category}
              disabled={disabled || busy}
              onChange={(event) => setValues({ ...values, category: event.target.value as OverviewValues["category"] })}
            >
              <option value="Sales">Sales</option>
              <option value="Files">Files</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Passing score</span>
            <span className="relative">
              <input
                type="number"
                min={0}
                max={100}
                className={`${fieldClass} pr-8`}
                value={values.examScoreThreshold}
                disabled={disabled || busy}
                onChange={(event) => setValues({ ...values, examScoreThreshold: Number(event.target.value) || 0 })}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">%</span>
            </span>
          </label>
        </div>

        <div className="grid gap-5 border-t border-slate-100 pt-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Difficulty</p>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <Segment selected={values.difficulty === "BEGINNER"} label="Beginner" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "BEGINNER" })} />
              <Segment selected={values.difficulty === "INTERMEDIATE"} label="Intermediate" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "INTERMEDIATE" })} />
              <Segment selected={values.difficulty === "ADVANCED"} label="Advanced" disabled={disabled} onClick={() => setValues({ ...values, difficulty: "ADVANCED" })} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">How trainees move</p>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <Segment
                selected={values.trainingMode === "PROGRESSION"}
                label="Progression"
                disabled={disabled}
                onClick={() => setValues({ ...values, trainingMode: "PROGRESSION" })}
              />
              <Segment
                selected={values.trainingMode === "SCHEDULED"}
                label="Scheduled"
                disabled={disabled}
                onClick={() => setValues({ ...values, trainingMode: "SCHEDULED" })}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{modeHint}</p>
          </div>
        </div>
      </section>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
