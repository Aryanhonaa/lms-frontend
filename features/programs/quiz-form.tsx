"use client";

import { Info, ListChecks, PenLine, Plus, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import type { QuestionType, Quiz, QuizInput } from "@/types/program";

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
  initial?: Quiz;
  onSubmit: (input: QuizInput) => Promise<void>;
};

type OptionDraft = { label: string; isCorrect: boolean };
type QuestionDraft = {
  type: QuestionType;
  prompt: string;
  points: number;
  modelAnswer: string;
  options: OptionDraft[];
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const DEFAULT_POINTS: Record<QuestionType, number> = { MULTIPLE_CHOICE: 1, WRITTEN: 5 };

const emptyOption = (isCorrect: boolean): OptionDraft => ({ label: "", isCorrect });

const emptyOptions = () => [emptyOption(true), emptyOption(false)];

const emptyQuestion = (type: QuestionType = "MULTIPLE_CHOICE"): QuestionDraft => ({
  type,
  prompt: "",
  points: DEFAULT_POINTS[type],
  modelAnswer: "",
  options: emptyOptions(),
});

function questionsFromQuiz(quiz?: Quiz): QuestionDraft[] {
  if (!quiz?.questions.length) {
    return [emptyQuestion()];
  }
  return quiz.questions.map((question) => {
    const type = question.type ?? "MULTIPLE_CHOICE";
    return {
      type,
      prompt: question.prompt,
      points: question.points || DEFAULT_POINTS[type],
      modelAnswer: question.modelAnswer ?? "",
      options:
        type === "WRITTEN" || question.options.length === 0
          ? emptyOptions()
          : question.options.map((option) => ({
              label: option.label,
              isCorrect: option.isCorrect,
            })),
    };
  });
}

function TypeToggle({
  value,
  disabled,
  onChange,
}: {
  value: QuestionType;
  disabled?: boolean;
  onChange: (type: QuestionType) => void;
}) {
  const choices: Array<{ type: QuestionType; label: string; icon: ReactNode }> = [
    { type: "MULTIPLE_CHOICE", label: "Multiple choice", icon: <ListChecks className="h-3.5 w-3.5" /> },
    { type: "WRITTEN", label: "Written answer", icon: <PenLine className="h-3.5 w-3.5" /> },
  ];
  return (
    <div role="radiogroup" aria-label="Question type" className="inline-flex rounded-xl bg-slate-200/70 p-0.5">
      {choices.map((choice) => {
        const active = value === choice.type;
        return (
          <button
            key={choice.type}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(choice.type)}
            className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {choice.icon}
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

export function QuizForm({ submitLabel, disabled, initial, onSubmit }: QuizFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => questionsFromQuiz(initial));

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
      questions: questions.map((question) =>
        question.type === "WRITTEN"
          ? {
              type: "WRITTEN" as const,
              prompt: question.prompt.trim(),
              points: question.points,
              modelAnswer: question.modelAnswer.trim(),
              options: [],
            }
          : {
              type: "MULTIPLE_CHOICE" as const,
              prompt: question.prompt.trim(),
              points: question.points,
              options: question.options.map((option) => ({
                label: option.label.trim(),
                isCorrect: option.isCorrect,
              })),
            },
      ),
    };

    for (const [index, question] of questions.entries()) {
      const label = `Question ${index + 1}`;
      if (!question.prompt.trim()) {
        setError(`${label} needs question text`);
        return;
      }
      if (!Number.isInteger(question.points) || question.points < 1 || question.points > 100) {
        setError(`${label}: points must be a whole number from 1 to 100`);
        return;
      }
      if (question.type === "WRITTEN") {
        continue;
      }
      if (question.options.length < MIN_OPTIONS || question.options.some((option) => !option.label.trim())) {
        setError(`${label} needs at least two filled-in answer options`);
        return;
      }
      if (question.options.filter((option) => option.isCorrect).length !== 1) {
        setError(`${label} needs exactly one correct option`);
        return;
      }
    }

    if (questionDrawCount !== null && payload.questions) {
      if (!Number.isInteger(questionDrawCount) || questionDrawCount < 1) {
        setError("Questions per attempt must be a whole number of at least 1");
        return;
      }
      if (questionDrawCount > payload.questions.length) {
        setError("Questions per attempt cannot exceed the number of questions in the bank");
        return;
      }
      const writtenTotal = questions.filter((question) => question.type === "WRITTEN").length;
      if (questionDrawCount < writtenTotal) {
        setError(
          `Every trainee always gets all ${writtenTotal} written question${writtenTotal === 1 ? "" : "s"}, so questions per attempt must be at least ${writtenTotal}`,
        );
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
      if (!initial) {
        form.reset();
        setQuestions([emptyQuestion()]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quiz");
    } finally {
      setBusy(false);
    }
  }

  const locked = disabled || busy;
  const writtenCount = questions.filter((question) => question.type === "WRITTEN").length;
  const totalPoints = questions.reduce((sum, question) => sum + (Number.isFinite(question.points) ? question.points : 0), 0);

  function changeType(index: number, type: QuestionType) {
    const question = questions[index];
    if (question.type === type) {
      return;
    }
    const pointsUntouched = question.points === DEFAULT_POINTS[question.type];
    updateQuestion(index, {
      ...question,
      type,
      points: pointsUntouched ? DEFAULT_POINTS[type] : question.points,
    });
  }

  return (
    <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title" required>
          <input
            name="title"
            placeholder="Week 1 quiz"
            defaultValue={initial?.title ?? ""}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Description">
          <input
            name="description"
            placeholder="Optional"
            defaultValue={initial?.description ?? ""}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Passing score" hint="Percent needed to pass.">
          <input
            name="passingScore"
            type="number"
            min={0}
            max={100}
            defaultValue={initial?.passingScore ?? 70}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Time limit" hint="Minutes. Leave blank for no limit.">
          <input
            name="timeLimitMin"
            type="number"
            min={1}
            placeholder="Optional"
            defaultValue={initial?.timeLimitMin ?? undefined}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Max attempts" hint="Leave blank for unlimited.">
          <input
            name="maxAttempts"
            type="number"
            min={1}
            placeholder="Optional"
            defaultValue={initial?.maxAttempts ?? undefined}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field
          label="Questions per attempt"
          hint={
            writtenCount > 0
              ? `How many questions a trainee sees. All ${writtenCount} written question${writtenCount === 1 ? " is" : "s are"} always included; the rest are drawn from multiple choice. Leave blank to use the whole bank.`
              : "How many questions a trainee sees. Leave blank to use the whole bank."
          }
        >
          <input
            name="questionDrawCount"
            type="number"
            min={1}
            max={200}
            placeholder="All questions"
            defaultValue={initial?.questionDrawCount ?? undefined}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" name="randomized" defaultChecked={initial?.randomized ?? true} disabled={locked} />
          Shuffle question and option order
        </label>
        <p className="self-end pb-2 text-sm text-slate-500">
          Trainees see their score after submit (after your grading, if there are written questions). They cannot
          review questions or answers. You can still see their paper.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-800">Questions</p>
            <p className="text-xs text-slate-500">
              Mix multiple-choice questions (graded automatically) with written questions (you grade them by hand).
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {questions.length} question{questions.length === 1 ? "" : "s"} · {totalPoints} point
            {totalPoints === 1 ? "" : "s"} total
          </p>
        </div>
        {writtenCount > 0 ? (
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This quiz has {writtenCount} written question{writtenCount === 1 ? "" : "s"}. After a trainee submits,
              you&apos;ll grade their answers under <span className="font-semibold">Assessments</span>. The trainee
              sees &ldquo;Awaiting review&rdquo; but can keep going with the course while they wait. Their score
              appears once you finish grading.
            </p>
          </div>
        ) : null}
        {questions.map((question, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  Question {index + 1}
                  <RequiredMark />
                </span>
                <TypeToggle
                  value={question.type}
                  disabled={locked}
                  onChange={(type) => changeType(index, type)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  Points
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={`${fieldClass} h-8 w-16 px-2 py-1 text-center`}
                    value={Number.isFinite(question.points) ? question.points : ""}
                    disabled={locked}
                    aria-label={`Points for question ${index + 1}`}
                    onChange={(event) =>
                      updateQuestion(index, { ...question, points: event.target.valueAsNumber })
                    }
                  />
                </label>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    disabled={locked}
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => removeQuestion(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            {question.type === "WRITTEN" ? (
              <>
                <textarea
                  className={`${fieldClass} min-h-[72px]`}
                  placeholder="e.g. Explain, in your own words, why phishing emails often create a sense of urgency."
                  value={question.prompt}
                  disabled={locked}
                  aria-label={`Question ${index + 1} text`}
                  onChange={(event) => updateQuestion(index, { ...question, prompt: event.target.value })}
                />
                <Field
                  label="Model answer / marking guide"
                  hint="Optional. Only you and co-trainers see this. It's shown next to each trainee's answer while grading."
                >
                  <textarea
                    className={`${fieldClass} min-h-[64px]`}
                    placeholder="Key points a full-mark answer should cover…"
                    value={question.modelAnswer}
                    disabled={locked}
                    onChange={(event) => updateQuestion(index, { ...question, modelAnswer: event.target.value })}
                  />
                </Field>
              </>
            ) : (
              <>
                <input
                  className={fieldClass}
                  placeholder="What should trainees be able to answer?"
                  value={question.prompt}
                  disabled={locked}
                  aria-label={`Question ${index + 1} text`}
                  onChange={(event) => updateQuestion(index, { ...question, prompt: event.target.value })}
                />
                <p className="text-xs text-slate-500">Answer options. Select the circle next to the correct answer.</p>
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
              </>
            )}
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`${secondaryButtonClass} w-full`}
            disabled={locked}
            onClick={() => setQuestions((current) => [...current, emptyQuestion("MULTIPLE_CHOICE")])}
          >
            <ListChecks className="h-4 w-4" />
            Add multiple choice
          </button>
          <button
            type="button"
            className={`${secondaryButtonClass} w-full`}
            disabled={locked}
            onClick={() => setQuestions((current) => [...current, emptyQuestion("WRITTEN")])}
          >
            <PenLine className="h-4 w-4" />
            Add written question
          </button>
        </div>
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
