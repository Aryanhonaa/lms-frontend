"use client";

import { Info, ListChecks, PenLine, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import { SaveStatus, type SaveState } from "@/components/ui/save-status";
import { fieldClass, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/features/programs/builder/ui";
import {
  clearQuizDraft,
  quizDraftHasContent,
  readQuizDraft,
  writeQuizDraft,
  type QuizQuestionDraft,
} from "@/features/programs/quiz-draft";
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
  draftKey?: string;
  onSubmit: (input: QuizInput) => Promise<void>;
};

type QuestionDraft = QuizQuestionDraft;

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const DEFAULT_POINTS: Record<QuestionType, number> = { MULTIPLE_CHOICE: 1, WRITTEN: 5 };

const emptyOption = (isCorrect: boolean) => ({ label: "", isCorrect });

const emptyOptions = () => [emptyOption(true), emptyOption(false)];

const emptyQuestion = (type: QuestionType = "MULTIPLE_CHOICE"): QuestionDraft => ({
  type,
  prompt: "",
  points: DEFAULT_POINTS[type],
  modelAnswer: "",
  keepOptionOrder: true,
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
      keepOptionOrder: question.keepOptionOrder !== false,
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

function metaFromQuiz(quiz?: Quiz) {
  return {
    title: quiz?.title ?? "",
    description: quiz?.description ?? "",
    passingScore: quiz?.passingScore ?? 70,
    timeLimitMin: quiz?.timeLimitMin != null ? String(quiz.timeLimitMin) : "",
    maxAttempts: quiz?.maxAttempts != null ? String(quiz.maxAttempts) : "",
    questionDrawCount: quiz?.questionDrawCount != null ? String(quiz.questionDrawCount) : "",
    randomized: quiz?.randomized ?? true,
    shuffleOptions: Boolean(quiz?.shuffleOptions),
  };
}

function loadFormState(draftKey: string | undefined, quiz?: Quiz) {
  const seed = {
    ...metaFromQuiz(quiz),
    questions: questionsFromQuiz(quiz),
    restored: false,
  };
  if (!draftKey) {
    return seed;
  }
  const draft = readQuizDraft(draftKey);
  if (!draft || !quizDraftHasContent(draft)) {
    return seed;
  }
  return {
    title: draft.title,
    description: draft.description,
    passingScore: draft.passingScore,
    timeLimitMin: draft.timeLimitMin,
    maxAttempts: draft.maxAttempts,
    questionDrawCount: draft.questionDrawCount,
    randomized: draft.randomized,
    shuffleOptions: draft.shuffleOptions,
    questions: draft.questions,
    restored: true,
  };
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

export function QuizForm({ submitLabel, disabled, initial, draftKey, onSubmit }: QuizFormProps) {
  const [boot] = useState(() => loadFormState(draftKey, initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(boot.title);
  const [description, setDescription] = useState(boot.description);
  const [passingScore, setPassingScore] = useState(boot.passingScore);
  const [timeLimitMin, setTimeLimitMin] = useState(boot.timeLimitMin);
  const [maxAttempts, setMaxAttempts] = useState(boot.maxAttempts);
  const [questionDrawCount, setQuestionDrawCount] = useState(boot.questionDrawCount);
  const [randomized, setRandomized] = useState(boot.randomized);
  const [shuffleOptions, setShuffleOptions] = useState(boot.shuffleOptions);
  const [questions, setQuestions] = useState<QuestionDraft[]>(boot.questions);
  const [draftStatus, setDraftStatus] = useState<SaveState>(boot.restored ? "saved" : "idle");
  const [restoredDraft, setRestoredDraft] = useState(boot.restored);
  const skipFirstSaveRef = useRef(true);

  useEffect(() => {
    if (!draftKey) {
      return;
    }
    if (skipFirstSaveRef.current) {
      skipFirstSaveRef.current = false;
      return;
    }
    const draft = {
      title,
      description,
      passingScore,
      timeLimitMin,
      maxAttempts,
      questionDrawCount,
      randomized,
      shuffleOptions,
      questions,
    };
    const timer = window.setTimeout(() => {
      if (!quizDraftHasContent(draft)) {
        clearQuizDraft(draftKey);
        setDraftStatus("idle");
        setRestoredDraft(false);
        return;
      }
      setDraftStatus("saving");
      writeQuizDraft(draftKey, draft);
      setDraftStatus("saved");
      setRestoredDraft(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    draftKey,
    title,
    description,
    passingScore,
    timeLimitMin,
    maxAttempts,
    questionDrawCount,
    randomized,
    shuffleOptions,
    questions,
  ]);

  function resetToInitial() {
    const next = metaFromQuiz(initial);
    setTitle(next.title);
    setDescription(next.description);
    setPassingScore(next.passingScore);
    setTimeLimitMin(next.timeLimitMin);
    setMaxAttempts(next.maxAttempts);
    setQuestionDrawCount(next.questionDrawCount);
    setRandomized(next.randomized);
    setShuffleOptions(next.shuffleOptions);
    setQuestions(questionsFromQuiz(initial));
    setError(null);
  }

  function discardDraft() {
    if (draftKey) {
      clearQuizDraft(draftKey);
    }
    resetToInitial();
    setRestoredDraft(false);
    setDraftStatus("idle");
  }

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
    const trimmedTitle = title.trim();
    const drawRaw = questionDrawCount.trim();
    const drawCount = drawRaw ? Number(drawRaw) : null;

    if (!trimmedTitle) {
      setError("Quiz title is required");
      return;
    }

    const payload: QuizInput = {
      title: trimmedTitle,
      description: description.trim(),
      passingScore: Number(passingScore) || 70,
      timeLimitMin: timeLimitMin.trim() ? Number(timeLimitMin) : null,
      maxAttempts: maxAttempts.trim() ? Number(maxAttempts) : null,
      randomized,
      shuffleOptions,
      questionDrawCount: drawCount,
      revealMode: "HIDDEN",
      revealAt: null,
      questions: questions.map((question) =>
        question.type === "WRITTEN"
          ? {
              type: "WRITTEN" as const,
              prompt: question.prompt.trim(),
              points: question.points,
              modelAnswer: question.modelAnswer.trim(),
              keepOptionOrder: true,
              options: [],
            }
          : {
              type: "MULTIPLE_CHOICE" as const,
              prompt: question.prompt.trim(),
              points: question.points,
              keepOptionOrder: question.keepOptionOrder,
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

    if (drawCount !== null && payload.questions) {
      if (!Number.isInteger(drawCount) || drawCount < 1) {
        setError("Questions per attempt must be a whole number of at least 1");
        return;
      }
      if (drawCount > payload.questions.length) {
        setError("Questions per attempt cannot exceed the number of questions in the bank");
        return;
      }
      const writtenTotal = questions.filter((question) => question.type === "WRITTEN").length;
      if (drawCount < writtenTotal) {
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
      if (draftKey) {
        clearQuizDraft(draftKey);
      }
      setRestoredDraft(false);
      setDraftStatus("idle");
      if (!initial) {
        resetToInitial();
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
      {draftKey && (draftStatus !== "idle" || restoredDraft) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state={draftStatus} />
            <span>
              {draftStatus === "saving"
                ? "Saving draft…"
                : restoredDraft
                  ? "Draft saved on this device. Reopens if you close this panel."
                  : "Draft saved on this device"}
            </span>
          </div>
          {restoredDraft ? (
            <button type="button" className="font-medium text-slate-700 underline-offset-2 hover:underline" onClick={discardDraft}>
              Discard draft
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title" required>
          <input
            name="title"
            placeholder="Week 1 quiz"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <Field label="Description">
          <input
            name="description"
            placeholder="Optional"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
            value={passingScore}
            onChange={(event) => setPassingScore(event.target.valueAsNumber)}
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
            value={timeLimitMin}
            onChange={(event) => setTimeLimitMin(event.target.value)}
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
            value={maxAttempts}
            onChange={(event) => setMaxAttempts(event.target.value)}
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
            value={questionDrawCount}
            onChange={(event) => setQuestionDrawCount(event.target.value)}
            className={fieldClass}
            disabled={locked}
          />
        </Field>
        <div className="self-end space-y-2 pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="randomized"
              checked={randomized}
              disabled={locked}
              onChange={(event) => setRandomized(event.target.checked)}
            />
            Shuffle question order
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={shuffleOptions}
              disabled={locked}
              onChange={(event) => setShuffleOptions(event.target.checked)}
            />
            Shuffle answer choices
          </label>
          <p className="text-xs text-slate-500">
            For “All of the above” or “None of the above”, keep that option last and turn on Keep answer order for that
            question.
          </p>
        </div>
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
                    <span className="w-5 shrink-0 text-xs font-semibold text-slate-500">
                      {OPTION_LABELS[optionIndex]}
                    </span>
                    <input
                      className={`flex-1 ${fieldClass}`}
                      placeholder={
                        optionIndex === question.options.length - 1
                          ? "e.g. All of the above"
                          : option.isCorrect
                            ? "Correct answer"
                            : "Incorrect answer"
                      }
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
                <label className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={question.keepOptionOrder}
                    disabled={locked}
                    onChange={(event) =>
                      updateQuestion(index, { ...question, keepOptionOrder: event.target.checked })
                    }
                  />
                  <span>
                    <span className="font-medium">Keep answer order</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {shuffleOptions
                        ? "Leave on so “All of the above” / “None of the above” stay at the bottom."
                        : "Recommended when the last option is “All of the above” or “None of the above”."}
                    </span>
                  </span>
                </label>
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
