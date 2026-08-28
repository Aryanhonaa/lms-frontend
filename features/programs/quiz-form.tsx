"use client";

import { useState, type FormEvent } from "react";
import { RequiredMark } from "@/components/ui/required-mark";
import { fieldClass, primaryButtonClass } from "@/features/programs/builder/ui";
import type { QuizInput } from "@/types/program";

type QuizFormProps = {
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (input: QuizInput) => Promise<void>;
};

const emptyQuestion = () => ({
  prompt: "",
  options: [
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
  ],
});

export function QuizForm({ submitLabel, disabled, onSubmit }: QuizFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [revealMode, setRevealMode] = useState<"HIDDEN" | "IMMEDIATE" | "SCHEDULED">("IMMEDIATE");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const passingScore = Number(data.get("passingScore") || 70);

    if (!title) {
      setError("Quiz title is required");
      return;
    }

    const revealAtRaw = String(data.get("revealAt") ?? "").trim();
    if (revealMode === "SCHEDULED" && !revealAtRaw) {
      setError("Choose when answers become visible");
      return;
    }

    const payload: QuizInput = {
      title,
      description: String(data.get("description") ?? "").trim(),
      passingScore,
      timeLimitMin: data.get("timeLimitMin") ? Number(data.get("timeLimitMin")) : null,
      maxAttempts: data.get("maxAttempts") ? Number(data.get("maxAttempts")) : null,
      randomized: data.get("randomized") === "on",
      revealMode,
      revealAt: revealMode === "SCHEDULED" ? new Date(revealAtRaw).toISOString() : null,
      questions: questions.map((question) => ({
        prompt: question.prompt.trim(),
        options: question.options.map((option) => ({
          label: option.label.trim(),
          isCorrect: option.isCorrect,
        })),
      })),
    };

    if (!payload.questions?.every((question) => question.prompt && question.options.every((option) => option.label))) {
      setError("Each question needs a prompt and two answers");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
      form.reset();
      setQuestions([emptyQuestion()]);
      setRevealMode("IMMEDIATE");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quiz");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">
            Quiz title
            <RequiredMark />
          </span>
          <input name="title" placeholder="Quiz title" className={fieldClass} disabled={disabled || busy} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Description</span>
          <input name="description" placeholder="Description" className={fieldClass} disabled={disabled || busy} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Passing score</span>
          <input
            name="passingScore"
            type="number"
            min={0}
            max={100}
            defaultValue={70}
            placeholder="Passing score"
            className={fieldClass}
            disabled={disabled || busy}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Time limit (minutes)</span>
          <input
            name="timeLimitMin"
            type="number"
            min={1}
            placeholder="Time limit (minutes)"
            className={fieldClass}
            disabled={disabled || busy}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Max attempts</span>
          <input
            name="maxAttempts"
            type="number"
            min={1}
            placeholder="Max attempts"
            className={fieldClass}
            disabled={disabled || busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="randomized" disabled={disabled || busy} />
          Randomize questions and options
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Show correct answers</span>
          <select
            className={fieldClass}
            value={revealMode}
            disabled={disabled || busy}
            onChange={(event) => setRevealMode(event.target.value as typeof revealMode)}
          >
            <option value="IMMEDIATE">Right after the trainee submits</option>
            <option value="HIDDEN">Keep them hidden</option>
            <option value="SCHEDULED">At a scheduled time</option>
          </select>
        </label>
        {revealMode === "SCHEDULED" ? (
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              Answers visible from
              <RequiredMark />
            </span>
            <input name="revealAt" type="datetime-local" className={fieldClass} disabled={disabled || busy} required />
          </label>
        ) : null}
      </div>
      {questions.map((question, index) => (
        <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">
              Question {index + 1}
              <RequiredMark />
            </span>
            <input
              className={fieldClass}
              placeholder={`Question ${index + 1}`}
              value={question.prompt}
              disabled={disabled || busy}
              onChange={(event) => {
                const next = [...questions];
                next[index] = { ...question, prompt: event.target.value };
                setQuestions(next);
              }}
            />
          </label>
          <p className="text-xs font-medium text-slate-600">
            Answers
            <RequiredMark />
          </p>
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={option.isCorrect}
                disabled={disabled || busy}
                onChange={() => {
                  const next = [...questions];
                  next[index] = {
                    ...question,
                    options: question.options.map((item, itemIndex) => ({
                      ...item,
                      isCorrect: itemIndex === optionIndex,
                    })),
                  };
                  setQuestions(next);
                }}
              />
              <input
                className={`flex-1 ${fieldClass}`}
                placeholder={optionIndex === 0 ? "Correct answer" : "Incorrect answer"}
                value={option.label}
                disabled={disabled || busy}
                onChange={(event) => {
                  const next = [...questions];
                  next[index] = {
                    ...question,
                    options: question.options.map((item, itemIndex) =>
                      itemIndex === optionIndex ? { ...item, label: event.target.value } : item,
                    ),
                  };
                  setQuestions(next);
                }}
              />
            </label>
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          className="text-sm font-medium text-violet-700 hover:text-violet-800"
          disabled={disabled || busy}
          onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
        >
          Add question
        </button>
        <button type="submit" className={primaryButtonClass} disabled={disabled || busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
