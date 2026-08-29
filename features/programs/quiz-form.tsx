"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import type { QuizInput } from "@/types/program";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-slate-800">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

type QuizFormProps = {
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (input: QuizInput) => Promise<void>;
};

type OptionDraft = { label: string; isCorrect: boolean };
type QuestionDraft = { prompt: string; options: OptionDraft[] };

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const emptyOption = (isCorrect: boolean): OptionDraft => ({ label: "", isCorrect });

const emptyQuestion = (): QuestionDraft => ({
  prompt: "",
  options: [emptyOption(true), emptyOption(false)],
});

export function QuizForm({ submitLabel, disabled, onSubmit }: QuizFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);

  function updateQuestion(index: number, nextQuestion: QuestionDraft) {
    setQuestions((current) => current.map((question, itemIndex) => (itemIndex === index ? nextQuestion : question)));
  }

  function removeQuestion(index: number) {
    setQuestions((current) => (current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  function addOption(index: number) {
    setQuestions((current) =>
      current.map((question, itemIndex) => {
        if (itemIndex !== index || question.options.length >= MAX_OPTIONS) {
          return question;
        }
        return { ...question, options: [...question.options, emptyOption(false)] };
      }),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, itemIndex) => {
        if (itemIndex !== questionIndex || question.options.length <= MIN_OPTIONS) {
          return question;
        }
        const options = question.options.filter((_, item) => item !== optionIndex);
        if (!options.some((option) => option.isCorrect)) {
          options[0] = { ...options[0], isCorrect: true };
        }
        return { ...question, options };
      }),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const passingScore = Number(data.get("passingScore") || 70);
    const drawRaw = String(data.get("questionDrawCount") ?? "").trim();
    const questionDrawCount = drawRaw ? Number(drawRaw) : null;

    if (!title) {
      setError("Quiz title is required");
      return;
    }

    const payload: QuizInput = {
      title,
      description: String(data.get("description") ?? "").trim(),
      passingScore,
      timeLimitMin: data.get("timeLimitMin") ? Number(data.get("timeLimitMin")) : null,
      maxAttempts: data.get("maxAttempts") ? Number(data.get("maxAttempts")) : null,
      randomized: data.get("randomized") === "on",
      questionDrawCount,
      revealMode: "HIDDEN",
      revealAt: null,
      questions: questions.map((question) => ({
        prompt: question.prompt.trim(),
        options: question.options.map((option) => ({
          label: option.label.trim(),
          isCorrect: option.isCorrect,
        })),
      })),
    };

    if (
      !payload.questions?.every(
        (question) =>
          question.prompt &&
          question.options.length >= MIN_OPTIONS &&
          question.options.length <= MAX_OPTIONS &&
          question.options.every((option) => option.label),
      )
    ) {
      setError("Each question needs text and at least two complete answer options");
      return;
    }

    if (
      !payload.questions.every((question) => question.options.filter((option) => option.isCorrect).length === 1)
    ) {
      setError("Each question needs exactly one correct option");
      return;
    }

    if (questionDrawCount !== null) {
      if (!Number.isInteger(questionDrawCount) || questionDrawCount < 1) {
        setError("Questions per attempt must be a whole number of at least 1");
        return;
      }
      if (questionDrawCount > payload.questions.length) {
        setError("Questions per attempt cannot exceed the number of questions in the bank");
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
      form.reset();
      setQuestions([emptyQuestion()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quiz");
    } finally {
      setBusy(false);
    }
  }

  const locked = disabled || busy;

  return (
    <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title" required>
          <input name="title" placeholder="Week 1 quiz" className={fieldClass} disabled={locked} />
        </Field>
        <Field label="Description">
          <input name="description" placeholder="Optional" className={fieldClass} disabled={locked} />
        </Field>
        <Field label="Passing score" hint="Percent needed to pass.">
          <input
            name="passingScore"
            type="number"
            min={0}
            max={100}
            defaultValue={70}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Time limit" hint="Minutes. Leave blank for no limit.">
          <input name="timeLimitMin" type="number" min={1} placeholder="Optional" className={fieldClass} disabled={locked} />
        </Field>
        <Field label="Max attempts" hint="Leave blank for unlimited.">
          <input name="maxAttempts" type="number" min={1} placeholder="Optional" className={fieldClass} disabled={locked} />
        </Field>
        <Field label="Questions per attempt" hint="How many questions a trainee sees. Leave blank to use the whole bank.">
          <input
            name="questionDrawCount"
            type="number"
            min={1}
            max={200}
            placeholder="All questions"
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" name="randomized" defaultChecked disabled={locked} />
          Shuffle question and option order
        </label>
        <p className="self-end pb-2 text-sm text-slate-500">
          Trainees see their score after submit. They cannot review questions or answers. You can still see their paper.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Questions</p>
          <p className="text-xs text-slate-500">
            Add as many as you need. Use × to remove a question or answer added by mistake. Mark the correct answer
            with the circle.
          </p>
        </div>
        {questions.map((question, index) => (
          <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Field label={`Question ${index + 1}`} required>
                  <input
                    className={fieldClass}
                    placeholder="What should trainees be able to answer?"
                    value={question.prompt}
                    disabled={locked}
                    onChange={(event) => updateQuestion(index, { ...question, prompt: event.target.value })}
                  />
                </Field>
              </div>
              {questions.length > 1 ? (
                <button
                  type="button"
                  className="mt-7 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  disabled={locked}
                  aria-label={`Remove question ${index + 1}`}
                  onClick={() => removeQuestion(index)}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <p className="pt-1 text-sm font-medium text-slate-800">
              Answer options
              <RequiredMark />
            </p>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={option.isCorrect}
                  disabled={locked}
                  aria-label={`Mark option ${OPTION_LABELS[optionIndex]} as correct`}
                  onChange={() =>
                    updateQuestion(index, {
                      ...question,
                      options: question.options.map((item, itemIndex) => ({
                        ...item,
                        isCorrect: itemIndex === optionIndex,
                      })),
                    })
                  }
                />
                <span className="w-5 shrink-0 text-xs font-semibold text-slate-500">{OPTION_LABELS[optionIndex]}</span>
                <input
                  className={`flex-1 ${fieldClass}`}
                  placeholder={option.isCorrect ? "Correct answer" : "Incorrect answer"}
                  value={option.label}
                  disabled={locked}
                  onChange={(event) =>
                    updateQuestion(index, {
                      ...question,
                      options: question.options.map((item, itemIndex) =>
                        itemIndex === optionIndex ? { ...item, label: event.target.value } : item,
                      ),
                    })
                  }
                />
                {question.options.length > MIN_OPTIONS ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    disabled={locked}
                    aria-label={`Remove option ${OPTION_LABELS[optionIndex]}`}
                    onClick={() => removeOption(index, optionIndex)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {question.options.length < MAX_OPTIONS ? (
              <button
                type="button"
                className={ghostButtonClass}
                disabled={locked}
                onClick={() => addOption(index)}
              >
                <Plus className="h-4 w-4" />
                Add answer
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className={`${secondaryButtonClass} w-full`}
          disabled={locked}
          onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div>
        <button type="submit" className={primaryButtonClass} disabled={locked}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
