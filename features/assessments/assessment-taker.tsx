"use client";

import { Hourglass, PenLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAssessmentAttempt,
  getTraineeAssessment,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { requestCourseReviewCheck } from "@/lib/course-review";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { SecureQuizNotice, SecureQuizIndicator } from "@/components/assessments/secure-quiz-notice";
import { SecureQuizWarning } from "@/components/assessments/secure-quiz-warning";
import { friendlyLockReason } from "@/lib/learning/ux";
import { traineeCardClass, traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useSecureQuizMode } from "@/hooks/use-secure-quiz-mode";
import type { AssessmentAttemptView, AssessmentCatalog } from "@/types/assessment";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function AssessmentTaker({
  catalog,
  onCatalogChange,
}: {
  catalog: AssessmentCatalog;
  onCatalogChange: (next: AssessmentCatalog) => void;
}) {
  const [attempt, setAttempt] = useState<AssessmentAttemptView | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = attempt?.deadlineAt ? new Date(attempt.deadlineAt).getTime() - now : null;
  const taking = attempt?.status === "IN_PROGRESS";
  const closed = attempt && attempt.status !== "IN_PROGRESS";
  const current = attempt?.questions[index];
  const isLastQuestion = attempt ? index === attempt.questions.length - 1 : false;
  const isAnswered = useCallback(
    (questionId: string) => Boolean(answers[questionId] || texts[questionId]?.trim()),
    [answers, texts],
  );
  const answeredCount = useMemo(
    () => attempt?.questions.filter((question) => isAnswered(question.id)).length ?? 0,
    [attempt, isAnswered],
  );
  const unansweredCount = (attempt?.questions.length ?? 0) - answeredCount;
  const writtenInAttempt = attempt?.questions.filter((question) => question.type === "WRITTEN").length ?? 0;
  const writtenInQuiz = catalog.assessment.writtenQuestionCount ?? 0;
  const attemptRef = useRef(attempt);
  const answersRef = useRef(answers);
  const textsRef = useRef(texts);
  const finishingRef = useRef(false);
  const secure = useSecureQuizMode(Boolean(taking));

  useEffect(() => {
    attemptRef.current = attempt;
    answersRef.current = answers;
    textsRef.current = texts;
  }, [attempt, answers, texts]);

  const finish = useCallback(
    async (currentAttempt: AssessmentAttemptView, selected: Record<string, string>, written: Record<string, string>) => {
      setBusy(true);
      setError(null);
      try {
        const payload = await submitAssessmentAttempt(
          currentAttempt.id,
          currentAttempt.questions.map((question) =>
            question.type === "WRITTEN"
              ? { questionId: question.id, optionIds: [], text: (written[question.id] ?? "").trim() }
              : { questionId: question.id, optionIds: selected[question.id] ? [selected[question.id]] : [] },
          ),
        );
        setAttempt(payload.attempt);
        setConfirming(false);
        onCatalogChange(await getTraineeAssessment(catalog.assessment.id));
        requestCourseReviewCheck();
      } catch (err: unknown) {
        setError(err instanceof ApiClientError ? err.message : "Unable to submit assessment");
      } finally {
        setBusy(false);
      }
    },
    [catalog.assessment.id, onCatalogChange],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentAttempt = attemptRef.current;
      const nowValue = Date.now();
      setNow(nowValue);
      const deadline = currentAttempt?.deadlineAt ? new Date(currentAttempt.deadlineAt).getTime() : null;
      if (
        currentAttempt?.status === "IN_PROGRESS" &&
        deadline !== null &&
        nowValue >= deadline &&
        !finishingRef.current
      ) {
        finishingRef.current = true;
        void finish(currentAttempt, answersRef.current, textsRef.current).finally(() => {
          finishingRef.current = false;
        });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finish]);

  async function startOrResume() {
    setBusy(true);
    setError(null);
    try {
      const payload = catalog.activeAttemptId
        ? await getAssessmentAttempt(catalog.activeAttemptId)
        : await startAssessmentAttempt(catalog.assessment.id);
      setAttempt(payload.attempt);
      setIndex(0);
      setAnswers({});
      setTexts({});
      setConfirming(false);
      setGateOpen(false);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to start this assessment");
    } finally {
      setBusy(false);
    }
  }

  function selectOption(questionId: string, optionId: string) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: optionId }));
  }

  function writeAnswer(questionId: string, text: string) {
    setTexts((currentTexts) => ({ ...currentTexts, [questionId]: text }));
  }

  function leaveAttempt() {
    setAttempt(null);
    setConfirming(false);
    setGateOpen(false);
  }

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${taking ? "secure-quiz-root" : ""}`}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 py-4 md:px-8">
        <div className="min-w-0">
          <ContentTypeChip type="QUIZ" kind={catalog.assessment.kind} />
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{catalog.assessment.title}</h2>
          <p className="text-sm text-slate-500">{catalog.assessment.location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {taking ? <SecureQuizIndicator /> : null}
          {taking && remainingMs !== null ? (
            <p className={`font-mono text-lg ${remainingMs < 60_000 ? "text-red-600" : "text-slate-900"}`}>
              {formatRemaining(remainingMs)}
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="px-8 py-3 text-sm text-red-600">{error}</p> : null}

      {gateOpen && !attempt ? (
        <SecureQuizWarning
          title={catalog.assessment.title}
          busy={busy}
          onConfirm={() => void startOrResume()}
          onCancel={() => setGateOpen(false)}
        />
      ) : null}

      {!attempt && !gateOpen ? (
        <section className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`${traineeCardClass} px-5 py-5`}>
            {catalog.assessment.description ? (
              <p className="text-sm leading-6 text-slate-700">{catalog.assessment.description}</p>
            ) : (
              <p className="text-sm text-slate-500">No additional instructions.</p>
            )}
            <dl className="mt-4 grid gap-2 text-sm text-slate-600">
              <div>
                Questions:{" "}
                {catalog.assessment.questionBankCount > catalog.assessment.questionCount
                  ? `${catalog.assessment.questionCount} of ${catalog.assessment.questionBankCount}`
                  : catalog.assessment.questionCount}
              </div>
              <div>Passing score: {catalog.assessment.passingScore}%</div>
              <div>Time limit: {catalog.assessment.timeLimitMin ? `${catalog.assessment.timeLimitMin} min` : "None"}</div>
              <div>
                Attempts: {catalog.attemptsUsed}
                {catalog.assessment.maxAttempts ? ` / ${catalog.assessment.maxAttempts}` : " (unlimited)"}
              </div>
              {writtenInQuiz > 0 ? (
                <div>
                  Written questions: {writtenInQuiz} (graded by your trainer)
                </div>
              ) : null}
              {catalog.bestScore !== null ? <div>Best score: {catalog.bestScore}%</div> : null}
              <div>
                Result:{" "}
                {catalog.passed ? "Passed" : catalog.pendingReview ? "Awaiting trainer review" : "Not passed"}
              </div>
            </dl>
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-950/5">
              {writtenInQuiz > 0
                ? "Multiple-choice answers are marked instantly. Your trainer reads and grades written answers, then your final score appears here. Questions and answers stay hidden."
                : "After you submit you will see your score. Questions and answers stay hidden. Your trainer can still review your paper."}
            </p>
            {catalog.assessment.status === "LOCKED" ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-950/5">
                This quiz is locked for now. {friendlyLockReason(catalog.assessment.reason)}
              </p>
            ) : catalog.pendingReview && !catalog.activeAttemptId ? (
              <PendingReviewNotice />
            ) : catalog.activeAttemptId || catalog.canStart ? (
              <button
                className={`${traineePrimaryCtaClass} mt-6`}
                disabled={busy || (!catalog.canStart && !catalog.activeAttemptId)}
                onClick={() => setGateOpen(true)}
              >
                {catalog.activeAttemptId
                  ? catalog.assessment.kind.includes("EXAM")
                    ? "Continue exam"
                    : "Continue quiz"
                  : catalog.attemptsUsed > 0
                    ? catalog.assessment.kind.includes("EXAM")
                      ? "Retry exam"
                      : "Retry quiz"
                    : catalog.assessment.kind.includes("EXAM")
                      ? "Start exam"
                      : "Start quiz"}
              </button>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-950/5">
                You have used all available attempts. You can continue with the course. This assessment was not passed.
              </p>
            )}
          </div>
          <AttemptHistory attempts={catalog.attempts} />
        </section>
      ) : null}

      {taking && current ? (
        <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-b border-slate-200/80 bg-white p-4 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Questions</p>
            <p className="mt-1 text-sm text-slate-600">
              {answeredCount} of {attempt.questions.length} completed
            </p>
            <ol className="mt-3 grid grid-cols-6 gap-2 lg:grid-cols-4">
              {attempt.questions.map((question, questionIndex) => (
                <li key={question.id}>
                  <button
                    type="button"
                    className={`h-8 w-full rounded-lg text-xs font-medium transition ${
                      questionIndex === index
                        ? "bg-violet-600 text-white"
                        : isAnswered(question.id)
                          ? "bg-violet-50 text-violet-800 ring-1 ring-violet-100"
                          : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setConfirming(false);
                      setIndex(questionIndex);
                    }}
                  >
                    {questionIndex + 1}
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="lms-progress-fill h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ width: `${(answeredCount / attempt.questions.length) * 100}%` }}
              />
            </div>
          </nav>
          <div className="overflow-y-auto px-4 py-6 md:px-8">
            <div className={`${traineeCardClass} px-5 py-5`}>
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                Question {index + 1} of {attempt.questions.length} · {current.points} pt
                {current.points === 1 ? "" : "s"}
                {current.type === "WRITTEN" ? (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                    Written answer
                  </span>
                ) : null}
              </p>
              <p className="mt-2 whitespace-pre-line text-base font-medium leading-7 text-slate-900">{current.prompt}</p>
              {current.type === "WRITTEN" ? (
                <WrittenAnswerField
                  key={current.id}
                  value={texts[current.id] ?? ""}
                  onChange={(text) => writeAnswer(current.id, text)}
                />
              ) : (
              <ul className="mt-4 grid gap-2">
                {current.options.map((option) => {
                  const selected = answers[current.id] === option.id;
                  return (
                    <li key={option.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm transition ${
                          selected ? "bg-violet-50 ring-1 ring-violet-200" : "bg-slate-50 ring-1 ring-transparent hover:ring-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={current.id}
                          checked={selected}
                          onChange={() => selectOption(current.id, option.id)}
                          className="mt-0.5"
                        />
                        <span>{option.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className={traineeSecondaryCtaClass}
                  disabled={index === 0}
                  onClick={() => {
                    setConfirming(false);
                    setIndex((value) => value - 1);
                  }}
                >
                  Previous
                </button>
                {isLastQuestion ? (
                  <button
                    type="button"
                    className={traineePrimaryCtaClass}
                    disabled={busy || confirming}
                    onClick={() => setConfirming(true)}
                  >
                    Submit
                  </button>
                ) : (
                  <button type="button" className={traineePrimaryCtaClass} onClick={() => setIndex((value) => value + 1)}>
                    Next
                  </button>
                )}
              </div>
              {confirming ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700 ring-1 ring-slate-950/5">
                  <p className="font-medium text-slate-900">Submit this attempt?</p>
                  <p className="mt-1">Your answers can&apos;t be changed after you submit.</p>
                  {unansweredCount > 0 ? (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
                      {unansweredCount} question{unansweredCount === 1 ? " is" : "s are"} still unanswered and will
                      score 0.
                    </p>
                  ) : null}
                  {writtenInAttempt > 0 ? (
                    <p className="mt-2 text-slate-600">
                      Your trainer will grade the written answer{writtenInAttempt === 1 ? "" : "s"}. You&apos;ll see
                      your final score once grading is done.
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={traineePrimaryCtaClass}
                      disabled={busy}
                      onClick={() => void finish(attempt, answers, texts)}
                    >
                      {busy ? "Submitting…" : "Confirm submit"}
                    </button>
                    <button type="button" className={traineeSecondaryCtaClass} disabled={busy} onClick={() => setConfirming(false)}>
                      Keep working
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {closed ? (
        <section className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`${traineeCardClass} px-5 py-5`}>
            {attempt.needsReview ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Hourglass className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-amber-800">
                      {attempt.status === "TIMED_OUT" ? "Time's up · " : ""}Submitted · Waiting for your trainer
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Your multiple-choice answers are marked. Your trainer will read and grade your written answers.
                      Your final score will appear here, and you&apos;ll get a notification when it&apos;s ready.
                    </p>
                  </div>
                </div>
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
                  You don&apos;t need to wait. The next part of the course is open, so carry on while your trainer
                  grades.
                </p>
              </>
            ) : (
              <>
                <p className={`text-lg font-semibold ${attempt.passed ? "text-emerald-700" : "text-red-700"}`}>
                  {attempt.status === "TIMED_OUT" ? "Timed out · " : ""}
                  {attempt.passed ? "Passed" : "Failed"} · {attempt.score ?? 0}% (pass {attempt.passingScore}%)
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Your attempt is recorded. Questions and answers stay hidden. Your trainer can review your paper.
                </p>
              </>
            )}
            <button type="button" className={`${traineeSecondaryCtaClass} mt-4`} onClick={leaveAttempt}>
              Back to overview
            </button>
          </div>
          <AttemptHistory attempts={catalog.attempts} />
        </section>
      ) : null}

      {secure.notice ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <SecureQuizNotice type={secure.notice.type} message={secure.notice.message} onDismiss={secure.dismissNotice} />
        </div>
      ) : null}
    </div>
  );
}

function AttemptHistory({ attempts }: { attempts: AssessmentCatalog["attempts"] }) {
  return (
    <aside className={`${traineeCardClass} px-5 py-4`}>
      <h3 className="text-sm font-semibold text-slate-900">Attempt history</h3>
      {attempts.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No attempts yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {attempts.map((item) => (
            <li key={item.id} className="py-2">
              <p>Attempt {item.attemptNumber}</p>
              {item.needsReview ? (
                <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  <Hourglass className="h-3 w-3" />
                  Waiting for trainer review
                </p>
              ) : (
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500">{item.status.replaceAll("_", " ").toLowerCase()}</span>
                  {item.score !== null ? <span className="text-slate-500">· {item.score}%</span> : null}
                  {item.passed === true ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Passed
                    </span>
                  ) : item.passed === false ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-200">
                      Failed
                    </span>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function PendingReviewNotice() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Submitted · Waiting for your trainer to grade</p>
        <p className="mt-1 text-amber-800">
          Your trainer is reviewing your written answers. You can carry on with the course in the meantime. Your score
          will show up here once grading is done.
        </p>
      </div>
    </div>
  );
}

const WRITTEN_ANSWER_MAX = 10_000;

function WrittenAnswerField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="mt-4">
      <textarea
        className="min-h-[200px] w-full resize-y rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-400"
        placeholder="Type your answer here…"
        value={value}
        maxLength={WRITTEN_ANSWER_MAX}
        aria-label="Your answer"
        autoFocus
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <PenLine className="h-3.5 w-3.5" />
          Your trainer grades this answer by hand.
        </span>
        <span>
          {words} word{words === 1 ? "" : "s"} · {value.length.toLocaleString()}/{WRITTEN_ANSWER_MAX.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
