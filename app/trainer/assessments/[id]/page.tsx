"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Keyboard,
  ListChecks,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { TrainerCourseBatchFilters } from "@/components/trainer-course-batch-filters";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrainerCourseBatch } from "@/hooks/use-trainer-course-batch";
import { getTrainerAssessment, gradeAssessmentAttempt, notifyGradingChanged } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { coveredTerms, highlightSegments, keyTerms } from "@/lib/assessments/grading";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type {
  TrainerAssessmentDetail,
  TrainerAssessmentQuestion,
  TrainerAssessmentRosterRow,
} from "@/types/assessment";

type RosterFilter = "all" | "needs" | "graded" | "none";

const UNSAVED_MESSAGE = "You have grades that aren't saved yet. Discard them?";

function statusLabel(status: string): string {
  if (status === "NOT_STARTED") {
    return "Not started";
  }
  if (status === "IN_PROGRESS") {
    return "In progress";
  }
  if (status === "TIMED_OUT") {
    return "Timed out";
  }
  return status.replaceAll("_", " ").toLowerCase();
}

function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${score}%`;
}

function isSubmitted(row: TrainerAssessmentRosterRow): boolean {
  return Boolean(row.latest && row.latest.status !== "IN_PROGRESS");
}

function matchesFilter(row: TrainerAssessmentRosterRow, filter: RosterFilter): boolean {
  if (filter === "needs") {
    return Boolean(row.latest?.needsReview);
  }
  if (filter === "graded") {
    return isSubmitted(row) && !row.latest?.needsReview;
  }
  if (filter === "none") {
    return !isSubmitted(row);
  }
  return true;
}

function SummaryChip({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "amber" }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 ring-1 ${
        tone === "amber" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-slate-50 text-slate-800 ring-slate-950/5"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
    </div>
  );
}

export default function TrainerAssessmentDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProgramId = searchParams.get("programId") ?? "";
  const urlBatchId = searchParams.get("batchId") ?? "";
  const openParam = searchParams.get("open") ?? "";
  const fromGrading = searchParams.get("from") === "grading";
  const autoOpenedRef = useRef(false);
  const scrollToRef = useRef<string | null>(null);
  const [resolvedProgramId, setResolvedProgramId] = useState(urlProgramId);
  const filters = useTrainerCourseBatch({
    programId: urlProgramId || resolvedProgramId || undefined,
    batchId: urlBatchId || undefined,
  });
  const [payload, setPayload] = useState<TrainerAssessmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RosterFilter | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (urlProgramId || !params.id) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id)
      .then((data) => {
        if (!cancelled) {
          setResolvedProgramId(data.assessment.programId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, urlProgramId]);

  useEffect(() => {
    if (!params.id || !filters.ready || !filters.programId || !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(params.id, { programId: filters.programId, batchId: filters.batchId })
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setResolvedProgramId(data.assessment.programId);
          setError(null);
          const target =
            openParam && !autoOpenedRef.current
              ? data.roster.find((row) => row.enrollmentId === openParam)
              : undefined;
          if (target) {
            autoOpenedRef.current = true;
            scrollToRef.current = target.enrollmentId;
            setFilter(target.latest?.needsReview ? "needs" : "all");
            setOpenId(target.enrollmentId);
            return;
          }
          setFilter((current) => current ?? ((data.summary.needsReviewCount ?? 0) > 0 ? "needs" : "all"));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, filters.ready, filters.programId, filters.batchId, reloadKey, openParam]);

  useEffect(() => {
    if (!openId || scrollToRef.current !== openId) {
      return;
    }
    scrollToRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`trainee-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openId]);

  useEffect(() => {
    if (!flash) {
      return;
    }
    const timer = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const roster: TrainerAssessmentRosterRow[] = useMemo(() => payload?.roster ?? [], [payload]);
  const counts = useMemo(
    () => ({
      all: roster.length,
      needs: roster.filter((row) => matchesFilter(row, "needs")).length,
      graded: roster.filter((row) => matchesFilter(row, "graded")).length,
      none: roster.filter((row) => matchesFilter(row, "none")).length,
    }),
    [roster],
  );

  function confirmDiscard(): boolean {
    if (!dirtyRef.current) {
      return true;
    }
    if (!window.confirm(UNSAVED_MESSAGE)) {
      return false;
    }
    dirtyRef.current = false;
    return true;
  }

  function nextInQueue(enrollmentId: string): TrainerAssessmentRosterRow | null {
    const index = roster.findIndex((row) => row.enrollmentId === enrollmentId);
    const queue = roster.filter((row) => row.latest?.needsReview && row.enrollmentId !== enrollmentId);
    return queue.find((row) => roster.indexOf(row) > index) ?? queue[0] ?? null;
  }

  function toggleRow(enrollmentId: string) {
    if (!confirmDiscard()) {
      return;
    }
    setOpenId((current) => (current === enrollmentId ? null : enrollmentId));
  }

  function changeFilter(next: RosterFilter) {
    if (next === filter || !confirmDiscard()) {
      return;
    }
    setFilter(next);
    setOpenId(null);
  }

  function onProgramChange(programId: string) {
    if (programId === filters.programId || !confirmDiscard()) {
      return;
    }
    router.push(`/trainer/assessments?programId=${encodeURIComponent(programId)}`);
  }

  function onBatchChange(batchId: string) {
    if (!confirmDiscard()) {
      return;
    }
    filters.setBatchId(batchId);
    const next = new URLSearchParams();
    if (filters.programId) {
      next.set("programId", filters.programId);
    }
    next.set("batchId", batchId);
    if (fromGrading) {
      next.set("from", "grading");
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  if (!user) {
    return null;
  }

  const selectedBatch = filters.batches.find((row) => row.id === filters.batchId);
  const loadError = error ?? filters.error;
  const questions = payload?.assessment.questions ?? [];
  const writtenCount = payload?.assessment.writtenQuestionCount ?? 0;
  const activeFilter = filter ?? "all";
  const visible = roster.filter((row) => matchesFilter(row, activeFilter));
  const tabs: Array<{ id: RosterFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    ...(writtenCount > 0 ? [{ id: "needs" as const, label: "Needs grading", count: counts.needs }] : []),
    { id: "graded", label: writtenCount > 0 ? "Graded" : "Submitted", count: counts.graded },
    { id: "none", label: "Not submitted", count: counts.none },
  ];
  const firstInQueue = roster.find((row) => row.latest?.needsReview) ?? null;

  return (
    <TrainerShell title={payload?.assessment.title ?? "Quiz"} user={user} crumbLabel={payload?.assessment.title}>
      {fromGrading ? (
        <Link
          href="/trainer/grading"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800"
          onClick={(event) => {
            if (!confirmDiscard()) {
              event.preventDefault();
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to To grade
        </Link>
      ) : null}
      <div className="mb-4">
        <TrainerCourseBatchFilters
          programs={filters.programs}
          batches={filters.batches}
          programId={filters.programId}
          batchId={filters.batchId}
          hideProgram
          onProgramChange={onProgramChange}
          onBatchChange={onBatchChange}
        />
      </div>
      {loadError ? <ErrorState message={loadError} /> : null}
      {!payload && !loadError ? <LoadingState label="Loading results…" /> : null}
      {filters.ready && filters.batches.length === 0 && !loadError ? (
        <EmptyState title="No batches yet." description="Create a batch for this course to review quiz results." />
      ) : null}
      {flash ? (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash}
        </div>
      ) : null}
      {payload ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-slate-600">
                {payload.assessment.programTitle} · {selectedBatch?.name} · {payload.assessment.location} ·{" "}
                {payload.assessment.questionBankCount > payload.assessment.questionCount
                  ? `${payload.assessment.questionCount} of ${payload.assessment.questionBankCount} questions`
                  : `${payload.assessment.questionCount} questions`}{" "}
                · pass {payload.assessment.passingScore}%
                {writtenCount > 0 ? ` · ${writtenCount} written` : ""}
              </p>
              {firstInQueue && !openId ? (
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => {
                    setFilter("needs");
                    setOpenId(firstInQueue.enrollmentId);
                  }}
                >
                  <PenLine className="h-4 w-4" />
                  Start grading ({counts.needs})
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryChip label="Trainees" value={payload.summary.rosterCount} />
              <SummaryChip label="Submitted" value={payload.summary.submittedCount} />
              {writtenCount > 0 ? (
                <SummaryChip
                  label="Needs grading"
                  value={payload.summary.needsReviewCount ?? 0}
                  tone={(payload.summary.needsReviewCount ?? 0) > 0 ? "amber" : "slate"}
                />
              ) : (
                <SummaryChip label="In progress" value={payload.summary.inProgressCount} />
              )}
              <SummaryChip label="Not started" value={payload.summary.notStartedCount} />
              <SummaryChip label="Avg score" value={formatScore(payload.summary.averageScore)} />
              <SummaryChip label="Pass rate" value={formatScore(payload.summary.passRate)} />
            </div>
            <div role="tablist" aria-label="Filter trainees" className="mt-4 flex flex-wrap gap-1.5">
              {tabs.map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => changeFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? tab.id === "needs"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/25" : "bg-white text-slate-500"}`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {roster.length === 0 ? (
            <EmptyState
              title="No trainees enrolled in this batch."
              description="Enroll trainees in this batch to collect quiz attempts."
            />
          ) : visible.length === 0 ? (
            <div className="px-5 py-10 text-center">
              {activeFilter === "needs" ? (
                <>
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-medium text-slate-900">All caught up</p>
                  <p className="mt-1 text-sm text-slate-500">No written answers are waiting for your grade.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">No trainees match this filter.</p>
              )}
            </div>
          ) : (
            visible.map((row) => {
              const latest = row.latest;
              const open = openId === row.enrollmentId;
              const next = latest?.needsReview || open ? nextInQueue(row.enrollmentId) : null;
              const queueLeft = roster.filter(
                (item) => item.latest?.needsReview && item.enrollmentId !== row.enrollmentId,
              ).length;
              return (
                <article
                  key={row.enrollmentId}
                  id={`trainee-${row.enrollmentId}`}
                  className={`border-t border-slate-100 p-5 ${open ? "bg-slate-50/40" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    aria-expanded={open}
                    onClick={() => toggleRow(row.enrollmentId)}
                  >
                    <div className="flex items-start gap-2">
                      <ChevronDown
                        className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                      />
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                          {row.trainee.name}
                          {latest?.needsReview ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                              <PenLine className="h-3 w-3" />
                              Needs grading
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {latest?.submittedAt ? new Date(latest.submittedAt).toLocaleString() : "—"}
                          {latest ? ` · attempt ${latest.attemptNumber}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-slate-800">
                        {latest?.needsReview ? "Awaiting your grade" : statusLabel(row.status)}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {latest?.needsReview ? "Score after grading" : formatScore(latest?.score)}
                        {latest?.passed === true ? " · passed" : latest?.passed === false ? " · failed" : ""}
                      </p>
                    </div>
                  </button>
                  {open ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {!latest || latest.status === "IN_PROGRESS" || latest.status === "NOT_STARTED" ? (
                        <p className="text-sm text-slate-500">
                          {latest?.status === "IN_PROGRESS"
                            ? "This trainee still has an attempt in progress."
                            : "No submitted paper yet."}
                        </p>
                      ) : (
                        <AttemptPaper
                          key={`${latest.id}:${latest.gradedAt ?? ""}`}
                          traineeName={row.trainee.name}
                          attempt={latest}
                          questions={questions}
                          passingScore={payload.assessment.passingScore}
                          nextTraineeName={next?.trainee.name ?? null}
                          returnToQueue={fromGrading}
                          queueLeft={queueLeft}
                          onDirtyChange={(dirty) => {
                            dirtyRef.current = dirty;
                          }}
                          onSaved={(message, advance) => {
                            dirtyRef.current = false;
                            if (advance && !next && fromGrading) {
                              router.push("/trainer/grading");
                              return;
                            }
                            setFlash(message);
                            if (advance && next) {
                              scrollToRef.current = next.enrollmentId;
                              setOpenId(next.enrollmentId);
                            }
                            setReloadKey((value) => value + 1);
                          }}
                        />
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </TrainerShell>
  );
}

type GradeDraft = { points: string; comment: string };

const QUICK_NOTES = ["Good answer", "Well explained", "Missing key points", "Add an example", "Too brief", "Off topic"];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function ShortcutHelp() {
  const rows: Array<[string, string]> = [
    ["0 – 9", "Set points for the highlighted answer"],
    ["F / H", "Full marks / half marks"],
    ["J / K", "Next / previous written answer"],
    ["Ctrl + Enter", "Save (and open the next trainee)"],
    ["Esc", "Leave a text box"],
  ];
  return (
    <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs text-slate-100">
      <p className="mb-2 font-semibold">Keyboard shortcuts</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([keys, label]) => (
          <div key={keys} className="contents">
            <dt>
              <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono">{keys}</kbd>
            </dt>
            <dd className="text-slate-300">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AttemptPaper({
  traineeName,
  attempt,
  questions,
  passingScore,
  nextTraineeName,
  returnToQueue,
  queueLeft,
  onDirtyChange,
  onSaved,
}: {
  traineeName: string;
  attempt: NonNullable<TrainerAssessmentRosterRow["latest"]>;
  questions: TrainerAssessmentQuestion[];
  passingScore: number;
  nextTraineeName: string | null;
  returnToQueue: boolean;
  queueLeft: number;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (message: string, advance: boolean) => void;
}) {
  const answerMap = useMemo(
    () => new Map(attempt.answers.map((answer) => [answer.questionId, answer])),
    [attempt.answers],
  );
  const paperQuestions = answerMap.size > 0 ? questions.filter((question) => answerMap.has(question.id)) : questions;
  const writtenQuestions = paperQuestions.filter((question) => question.type === "WRITTEN");
  const choiceQuestions = paperQuestions.filter((question) => question.type !== "WRITTEN");
  const [initialDrafts] = useState<Record<string, GradeDraft>>(() =>
    Object.fromEntries(
      writtenQuestions.map((question) => {
        const answer = answerMap.get(question.id);
        return [
          question.id,
          {
            points: answer && !answer.needsReview ? String(answer.pointsAwarded) : "",
            comment: answer?.trainerComment ?? "",
          },
        ];
      }),
    ),
  );
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>(initialDrafts);
  const [focusIndex, setFocusIndex] = useState(() => {
    const firstPending = writtenQuestions.findIndex((question) => answerMap.get(question.id)?.needsReview);
    return Math.max(0, firstPending);
  });
  const [showChoice, setShowChoice] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const alreadyGraded = !attempt.needsReview && Boolean(attempt.gradedAt);
  const dirty = writtenQuestions.some(
    (question) =>
      (drafts[question.id]?.points ?? "") !== (initialDrafts[question.id]?.points ?? "") ||
      (drafts[question.id]?.comment ?? "") !== (initialDrafts[question.id]?.comment ?? ""),
  );

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setDraft(questionId: string, next: Partial<GradeDraft>) {
    setDrafts((current) => ({ ...current, [questionId]: { ...current[questionId], ...next } }));
  }

  function addQuickNote(questionId: string, note: string) {
    const current = drafts[questionId]?.comment.trim() ?? "";
    if (current.includes(note)) {
      return;
    }
    setDraft(questionId, { comment: current ? `${current}${/[.!?]$/.test(current) ? "" : "."} ${note}.` : `${note}.` });
  }

  function focusQuestion(index: number) {
    const bounded = Math.min(Math.max(index, 0), writtenQuestions.length - 1);
    setFocusIndex(bounded);
    const question = writtenQuestions[bounded];
    if (question) {
      cardRefs.current[question.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function draftPoints(question: TrainerAssessmentQuestion): number | null {
    const raw = drafts[question.id]?.points ?? "";
    if (raw.trim() === "") {
      return null;
    }
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 && value <= question.points ? value : null;
  }

  const total = paperQuestions.reduce((sum, question) => sum + question.points, 0);
  const choiceEarned = choiceQuestions.reduce((sum, question) => sum + (answerMap.get(question.id)?.pointsAwarded ?? 0), 0);
  const choiceTotal = choiceQuestions.reduce((sum, question) => sum + question.points, 0);
  const choiceCorrect = choiceQuestions.filter((question) => answerMap.get(question.id)?.isCorrect).length;
  let earned = choiceEarned;
  let ungraded = 0;
  for (const question of writtenQuestions) {
    const points = draftPoints(question);
    if (points === null) {
      ungraded += 1;
    } else {
      earned += points;
    }
  }
  const previewScore = total > 0 ? Math.round((earned / total) * 10000) / 100 : 0;
  const previewPassed = previewScore >= passingScore;
  const canAdvance = Boolean(nextTraineeName) || returnToQueue;

  async function save(advance: boolean) {
    const grades = [];
    for (const question of writtenQuestions) {
      const raw = drafts[question.id]?.points ?? "";
      if (raw.trim() === "") {
        continue;
      }
      const points = draftPoints(question);
      if (points === null) {
        focusQuestion(writtenQuestions.indexOf(question));
        setError(`Points must be a whole number from 0 to ${question.points}.`);
        return;
      }
      grades.push({ questionId: question.id, pointsAwarded: points, comment: drafts[question.id]?.comment.trim() });
    }
    if (grades.length === 0) {
      setError("Give points to at least one written answer before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await gradeAssessmentAttempt(attempt.id, grades);
      const message = result.attempt.needsReview
        ? `Saved for ${traineeName}. ${ungraded} written answer${ungraded === 1 ? "" : "s"} still to grade.`
        : `Graded ${traineeName}: ${result.attempt.score ?? 0}% (${result.attempt.passed ? "passed" : "not passed"}). They've been notified.`;
      notifyGradingChanged();
      onSaved(advance && nextTraineeName ? `${message} Now grading ${nextTraineeName}.` : message, advance);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to save grades");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (saving || writtenQuestions.length === 0) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void save(canAdvance);
        return;
      }
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape" && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const question = writtenQuestions[focusIndex];
      if (!question) {
        return;
      }
      const key = event.key.toLowerCase();
      if (/^[0-9]$/.test(key)) {
        const value = Number(key);
        if (value <= question.points) {
          event.preventDefault();
          setDraft(question.id, { points: String(value) });
        }
      } else if (key === "f") {
        event.preventDefault();
        setDraft(question.id, { points: String(question.points) });
      } else if (key === "h") {
        event.preventDefault();
        setDraft(question.id, { points: String(Math.floor(question.points / 2)) });
      } else if (key === "j") {
        event.preventDefault();
        focusQuestion(focusIndex + 1);
      } else if (key === "k") {
        event.preventDefault();
        focusQuestion(focusIndex - 1);
      } else if (key === "?") {
        setShowHelp((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="grid gap-3">
      {writtenQuestions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {writtenQuestions.length} written answer{writtenQuestions.length === 1 ? "" : "s"} to check
            {queueLeft > 0 ? ` · ${queueLeft} more trainee${queueLeft === 1 ? "" : "s"} waiting after this` : ""}
          </p>
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-expanded={showHelp}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Shortcuts
          </button>
        </div>
      ) : null}
      {showHelp ? <ShortcutHelp /> : null}

      <ol className="grid gap-3">
        {writtenQuestions.map((question, index) => {
          const answer = answerMap.get(question.id);
          const draft = drafts[question.id] ?? { points: "", comment: "" };
          const pointsValid = draft.points.trim() === "" || draftPoints(question) !== null;
          const text = answer?.textAnswer ?? "";
          const hasText = text.trim().length > 0;
          const half = Math.floor(question.points / 2);
          const terms = keyTerms(question.modelAnswer ?? "");
          const covered = coveredTerms(text, terms);
          const focused = index === focusIndex;
          const graded = draftPoints(question) !== null;
          const words = hasText ? text.trim().split(/\s+/).length : 0;
          return (
            <li
              key={question.id}
              ref={(node) => {
                cardRefs.current[question.id] = node;
              }}
              onClick={() => setFocusIndex(index)}
              className={`scroll-mt-24 rounded-xl px-4 py-3 text-sm ring-1 transition ${
                focused ? "bg-white ring-2 ring-violet-400" : graded ? "bg-white ring-slate-200" : "bg-amber-50/60 ring-amber-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="whitespace-pre-line font-medium text-slate-900">
                  <span className="mr-1 text-slate-400">Written {index + 1}.</span>
                  {question.prompt}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    graded ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"
                  }`}
                >
                  {graded ? `${draft.points}/${question.points} pts` : `${question.points} pt${question.points === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div>
                  <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>{traineeName}&apos;s answer</span>
                    {hasText ? <span className="font-normal normal-case">{words} words</span> : null}
                  </p>
                  {hasText ? (
                    <p className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-[15px] leading-7 text-slate-800 ring-1 ring-slate-200">
                      {highlightSegments(text, terms).map((segment, segmentIndex) =>
                        segment.hit ? (
                          <mark key={segmentIndex} className="rounded bg-emerald-100 px-0.5 text-emerald-900">
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={segmentIndex}>{segment.text}</span>
                        ),
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 rounded-lg bg-white px-3 py-2 italic text-slate-400 ring-1 ring-slate-200">
                      No answer written (scored 0 automatically)
                    </p>
                  )}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <BookOpenCheck className="h-3.5 w-3.5" />
                    Marking guide
                  </p>
                  {question.modelAnswer?.trim() ? (
                    <>
                      <p className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-emerald-50/60 px-3 py-2 leading-6 text-slate-700 ring-1 ring-emerald-100">
                        {question.modelAnswer}
                      </p>
                      {terms.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-[11px] text-slate-500">
                            Key terms found: {covered.size}/{terms.length}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {terms.map((term) => (
                              <span
                                key={term}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  covered.has(term)
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-400 line-through"
                                }`}
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 rounded-lg bg-white px-3 py-2 italic text-slate-400 ring-1 ring-slate-200">
                      No marking guide yet. Add one when editing the quiz to get key-term hints here.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Points</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={question.points}
                      inputMode="numeric"
                      value={draft.points}
                      placeholder="–"
                      disabled={saving}
                      aria-label={`Points for written question ${index + 1}`}
                      aria-invalid={!pointsValid}
                      onFocus={() => setFocusIndex(index)}
                      onChange={(event) => setDraft(question.id, { points: event.target.value })}
                      className={`h-9 w-16 rounded-lg bg-white px-2 text-center text-sm font-semibold outline-none ring-1 focus:ring-2 ${
                        pointsValid ? "ring-slate-200 focus:ring-violet-400" : "ring-red-300 focus:ring-red-400"
                      }`}
                    />
                    <span className="text-slate-500">/ {question.points}</span>
                    <div className="ml-1 flex gap-1">
                      {[
                        { label: "0", value: 0 },
                        ...(half > 0 && half < question.points ? [{ label: "Half", value: half }] : []),
                        { label: "Full", value: question.points },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setFocusIndex(index);
                            setDraft(question.id, { points: String(preset.value) });
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                            draft.points === String(preset.value)
                              ? "bg-violet-600 text-white ring-violet-600"
                              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!pointsValid ? (
                    <p className="mt-1 text-xs text-red-600">Enter 0 – {question.points}</p>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  <label
                    htmlFor={`note-${attempt.id}-${question.id}`}
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Note to trainee (optional)
                  </label>
                  <textarea
                    id={`note-${attempt.id}-${question.id}`}
                    value={draft.comment}
                    disabled={saving}
                    maxLength={2000}
                    rows={2}
                    placeholder="What was good, what was missing…"
                    onFocus={() => setFocusIndex(index)}
                    onChange={(event) => setDraft(question.id, { comment: event.target.value })}
                    className="min-h-[38px] resize-y rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-400"
                  />
                  <div className="flex flex-wrap gap-1">
                    {QUICK_NOTES.map((note) => (
                      <button
                        key={note}
                        type="button"
                        disabled={saving}
                        onClick={() => addQuickNote(question.id, note)}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-violet-100 hover:text-violet-800"
                      >
                        + {note}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {choiceQuestions.length > 0 ? (
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setShowChoice((value) => !value)}
            aria-expanded={showChoice}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
          >
            <span className="flex items-center gap-2 font-medium text-slate-800">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Multiple choice: {choiceCorrect}/{choiceQuestions.length} correct · {choiceEarned}/{choiceTotal} pts
              <span className="font-normal text-slate-500">(marked automatically)</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition ${showChoice ? "rotate-180" : ""}`} />
          </button>
          {showChoice ? (
            <ol className="grid gap-2 px-4 pb-4">
              {choiceQuestions.map((question, index) => {
                const answer = answerMap.get(question.id);
                const selected = question.options.filter((option) =>
                  (answer?.selectedOptionIds ?? []).includes(option.id),
                );
                const correct = question.options.filter((option) => option.isCorrect);
                return (
                  <li key={question.id} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                    <p className="font-medium text-slate-900">
                      {index + 1}. {question.prompt}
                    </p>
                    <p className={`mt-1 ${answer?.isCorrect ? "text-emerald-700" : "text-red-600"}`}>
                      {answer ? (answer.isCorrect ? "Correct" : "Incorrect") : "Unanswered"}
                      {answer ? ` · ${answer.pointsAwarded}/${question.points} pt` : ""}
                    </p>
                    <p className="mt-1 text-slate-600">
                      Their answer: {selected.length ? selected.map((option) => option.label).join(", ") : "—"}
                    </p>
                    <p className="mt-1 text-slate-600">
                      Correct answer: {correct.map((option) => option.label).join(", ") || "—"}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      ) : null}

      {writtenQuestions.length > 0 ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-slate-900">
              {ungraded > 0 ? (
                <>
                  Score so far: {earned}/{total} pts ·{" "}
                  <span className="text-amber-700">
                    {ungraded} written answer{ungraded === 1 ? "" : "s"} left
                  </span>
                </>
              ) : (
                <>
                  Final score: {previewScore}% ({earned}/{total} pts) ·{" "}
                  <span className={previewPassed ? "text-emerald-700" : "text-red-600"}>
                    {previewPassed ? "Passes" : "Below pass mark"} ({passingScore}%)
                  </span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {ungraded > 0
                ? "You can save now and finish later. The trainee sees their result once everything is graded."
                : "Saving publishes the score to the trainee and notifies them."}
              {dirty ? <span className="ml-1 font-medium text-amber-700">Unsaved changes.</span> : null}
            </p>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canAdvance ? (
              <>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={saving}
                  onClick={() => void save(false)}
                >
                  {alreadyGraded ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={saving}
                  onClick={() => void save(true)}
                  title="Ctrl + Enter"
                >
                  {saving ? "Saving…" : nextTraineeName ? `Save & next: ${nextTraineeName}` : "Save & back to queue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={saving}
                onClick={() => void save(false)}
                title="Ctrl + Enter"
              >
                {saving ? "Saving…" : alreadyGraded ? "Update grades" : "Save grades"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
