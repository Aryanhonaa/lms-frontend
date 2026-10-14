"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  ListChecks,
  Maximize2,
  MessageSquarePlus,
  PenLine,
  X,
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
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
            <p className="text-sm text-slate-600">
              {payload.assessment.programTitle} · {selectedBatch?.name} · {payload.assessment.location}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {payload.assessment.questionBankCount > payload.assessment.questionCount
                ? `${payload.assessment.questionCount} of ${payload.assessment.questionBankCount} questions`
                : `${payload.assessment.questionCount} questions`}
              {writtenCount > 0 ? ` · ${writtenCount} written` : ""} · pass mark {payload.assessment.passingScore}%
            </p>

            {counts.needs > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <p className="text-sm font-medium text-amber-900">
                  {counts.needs} trainee{counts.needs === 1 ? "" : "s"} waiting for your grade
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
                    Start grading
                  </button>
                ) : null}
              </div>
            ) : writtenCount > 0 && counts.graded > 0 ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Every written answer is graded
              </p>
            ) : null}

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Submitted" value={`${payload.summary.submittedCount}/${payload.summary.rosterCount}`} />
              <Stat label="Avg score" value={formatScore(payload.summary.averageScore)} />
              <Stat label="Pass rate" value={formatScore(payload.summary.passRate)} />
            </dl>
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

const LONG_ANSWER_CHARS = 600;
const LONG_ANSWER_LINES = 10;
/** Short answers read fine in place, so focus mode is only offered once there is enough text. */
const FOCUS_MODE_CHARS = 240;
const GUIDE_TERM_LIMIT = 8;
const READER_SIZES = [
  "text-sm leading-6",
  "text-[15px] leading-7",
  "text-base leading-7",
  "text-lg leading-8",
] as const;
const READER_SIZE_KEY = "lms.grading.readerSize";
const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40";
const linkButtonClass =
  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-50";

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function initialReaderSize(): number {
  if (typeof window === "undefined") {
    return 1;
  }
  const saved = Number(window.localStorage.getItem(READER_SIZE_KEY));
  return Number.isInteger(saved) && saved >= 0 && saved < READER_SIZES.length ? saved : 1;
}

function HighlightedText({ text, terms, className }: { text: string; terms: string[]; className?: string }) {
  return (
    <div className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {highlightSegments(text, terms).map((segment, index) =>
        segment.hit ? (
          <mark key={index} className="rounded bg-emerald-100 px-0.5 text-emerald-900">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}

function MarkingGuide({ modelAnswer, terms, covered }: { modelAnswer: string; terms: string[]; covered: Set<string> }) {
  return (
    <aside className="min-w-0 rounded-lg bg-emerald-50/50 px-3.5 py-3 ring-1 ring-emerald-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Model answer</p>
      <p className="mt-1.5 max-h-52 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {modelAnswer}
      </p>
      {terms.length > 0 ? (
        <div className="mt-3 border-t border-emerald-100 pt-2.5">
          <p className="text-[11px] font-medium text-emerald-900">
            Key terms used: {covered.size} of {terms.length}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {terms.slice(0, GUIDE_TERM_LIMIT).map((term) => (
              <span
                key={term}
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  covered.has(term) ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {term}
              </span>
            ))}
            {terms.length > GUIDE_TERM_LIMIT ? (
              <span className="px-1 py-0.5 text-[11px] text-slate-400">+{terms.length - GUIDE_TERM_LIMIT} more</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

/** Whole-number scores are picked in one click; only unusually large questions fall back to typing. */
function ScorePicker({
  question,
  value,
  disabled,
  onChange,
  onFocus,
}: {
  question: TrainerAssessmentQuestion;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  const max = question.points;
  const raw = value.trim();
  const parsed = Number(raw);
  const valid = raw === "" || (Number.isInteger(parsed) && parsed >= 0 && parsed <= max);

  if (max > 10) {
    const half = Math.floor(max / 2);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score</span>
        <input
          type="number"
          min={0}
          max={max}
          inputMode="numeric"
          value={value}
          placeholder="–"
          disabled={disabled}
          aria-label={`Score out of ${max}`}
          aria-invalid={!valid}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          className={`h-9 w-16 rounded-lg bg-white px-2 text-center text-sm font-semibold outline-none ring-1 focus:ring-2 ${
            valid ? "ring-slate-200 focus:ring-violet-400" : "ring-red-300 focus:ring-red-400"
          }`}
        />
        <span className="text-xs text-slate-400">out of {max}</span>
        {[
          { label: "None", points: 0 },
          { label: "Half", points: half },
          { label: "Full", points: max },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={disabled}
            onClick={() => {
              onFocus();
              onChange(String(preset.points));
            }}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
              raw === String(preset.points)
                ? "bg-violet-600 text-white ring-violet-600"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-violet-50"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {!valid ? <span className="text-xs text-red-600">Enter 0 – {max}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score</span>
      <div role="group" aria-label={`Score out of ${max}`} className="flex flex-wrap gap-1">
        {Array.from({ length: max + 1 }, (_, points) => {
          const active = raw === String(points);
          return (
            <button
              key={points}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => {
                onFocus();
                onChange(active ? "" : String(points));
              }}
              className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold tabular-nums transition ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50 hover:text-violet-700"
              }`}
            >
              {points}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-slate-400">out of {max}</span>
    </div>
  );
}

/** Notes are optional, so the editor stays folded away until the trainer wants it. */
function NoteField({
  id,
  value,
  disabled,
  rows = 2,
  alwaysOpen,
  onChange,
  onFocus,
  onQuickNote,
}: {
  id: string;
  value: string;
  disabled: boolean;
  rows?: number;
  alwaysOpen?: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onQuickNote: (note: string) => void;
}) {
  const [open, setOpen] = useState(() => Boolean(alwaysOpen) || value.trim().length > 0);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          onFocus();
          window.setTimeout(() => fieldRef.current?.focus(), 0);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-violet-700"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Add a note for the trainee
      </button>
    );
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Note to trainee <span className="font-normal normal-case text-slate-400">(optional)</span>
      </label>
      <textarea
        id={id}
        ref={fieldRef}
        value={value}
        disabled={disabled}
        maxLength={2000}
        rows={rows}
        placeholder="What was good, what was missing…"
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[38px] resize-y rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-400"
      />
      <div className="flex flex-wrap gap-1">
        {QUICK_NOTES.map((note) => (
          <button
            key={note}
            type="button"
            disabled={disabled}
            onClick={() => onQuickNote(note)}
            className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 transition hover:bg-violet-50 hover:text-violet-800"
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortcutHelp() {
  const rows: Array<[string, string]> = [
    ["0 – 9", "Set points for the highlighted answer"],
    ["F / H", "Full marks / half marks"],
    ["J / K", "Next / previous written answer"],
    ["R", "Read the highlighted answer in focus mode"],
    ["Ctrl + Enter", "Save (and open the next trainee)"],
    ["Esc", "Close focus mode / leave a text box"],
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
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerSize, setReaderSize] = useState(initialReaderSize);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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

  useEffect(() => {
    if (!readerOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [readerOpen]);

  function openReader(index: number) {
    setFocusIndex(index);
    setReaderOpen(true);
  }

  function changeReaderSize(delta: number) {
    const next = Math.min(Math.max(readerSize + delta, 0), READER_SIZES.length - 1);
    setReaderSize(next);
    window.localStorage.setItem(READER_SIZE_KEY, String(next));
  }

  function toggleExpanded(questionId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

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

  const readerQuestion = readerOpen ? writtenQuestions[focusIndex] : undefined;
  const readerDraft = readerQuestion ? (drafts[readerQuestion.id] ?? { points: "", comment: "" }) : undefined;
  const readerText = readerQuestion ? (answerMap.get(readerQuestion.id)?.textAnswer ?? "") : "";
  const readerTerms = readerQuestion ? keyTerms(readerQuestion.modelAnswer?.trim() ?? "") : [];

  const saveBar = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`shrink-0 rounded-xl px-3 py-1.5 text-center ${
            ungraded > 0
              ? "bg-slate-100 text-slate-700"
              : previewPassed
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
          }`}
        >
          <p className="text-lg font-bold leading-none tabular-nums">{previewScore}%</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">
            {ungraded > 0 ? "So far" : previewPassed ? "Passes" : "Below"}
          </p>
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-slate-900">
            {earned}/{total} pts
            <span className="font-normal text-slate-500"> · pass mark {passingScore}%</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {ungraded > 0
              ? `${ungraded} answer${ungraded === 1 ? "" : "s"} still to score — you can save and finish later.`
              : "Saving sends the result to the trainee."}
            {dirty ? <span className="ml-1 font-medium text-amber-700">Unsaved changes.</span> : null}
          </p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {canAdvance ? (
          <>
            <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => void save(false)}>
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
    </>
  );

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
      if (readerOpen && event.key === "Escape") {
        event.preventDefault();
        setReaderOpen(false);
        return;
      }
      if (readerOpen && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        focusQuestion(focusIndex + (event.key === "ArrowRight" ? 1 : -1));
        return;
      }
      const question = writtenQuestions[focusIndex];
      if (!question) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        setReaderOpen(true);
        return;
      }
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={writtenQuestions.length - ungraded}
              aria-valuemin={0}
              aria-valuemax={writtenQuestions.length}
            >
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${((writtenQuestions.length - ungraded) / writtenQuestions.length) * 100}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-600">
              {writtenQuestions.length - ungraded} of {writtenQuestions.length} answer
              {writtenQuestions.length === 1 ? "" : "s"} scored
            </p>
            {queueLeft > 0 ? (
              <p className="text-xs text-slate-400">
                {queueLeft} more trainee{queueLeft === 1 ? "" : "s"} after this
              </p>
            ) : null}
          </div>
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

      <ol className="grid gap-4">
        {writtenQuestions.map((question, index) => {
          const answer = answerMap.get(question.id);
          const draft = drafts[question.id] ?? { points: "", comment: "" };
          const text = answer?.textAnswer ?? "";
          const hasText = text.trim().length > 0;
          const guide = question.modelAnswer?.trim() ?? "";
          const terms = keyTerms(guide);
          const covered = coveredTerms(text, terms);
          const focused = index === focusIndex;
          const graded = draftPoints(question) !== null;
          const words = countWords(text);
          const long = text.length > LONG_ANSWER_CHARS || text.split("\n").length > LONG_ANSWER_LINES;
          const collapsed = long && !expanded.has(question.id);
          const roomy = text.length > FOCUS_MODE_CHARS;
          return (
            <li
              key={question.id}
              ref={(node) => {
                cardRefs.current[question.id] = node;
              }}
              onClick={() => setFocusIndex(index)}
              className={`scroll-mt-24 overflow-hidden rounded-xl bg-white transition ${
                focused ? "ring-2 ring-violet-400" : "ring-1 ring-slate-200"
              }`}
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                <span
                  className={`mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    graded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}
                  aria-hidden
                >
                  {graded ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <p className="min-w-0 flex-1 whitespace-pre-line text-sm font-medium text-slate-900">
                  {question.prompt}
                </p>
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    graded ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  {graded ? `${draft.points} / ${question.points}` : `${question.points} pt${question.points === 1 ? "" : "s"}`}
                </span>
              </div>

              <div className={`grid gap-4 px-4 py-4 ${guide ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Answer
                    {hasText ? (
                      <span className="font-normal normal-case tracking-normal text-slate-400">
                        {words} word{words === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </p>
                  {hasText ? (
                    <>
                      <div className={`relative mt-1.5 ${collapsed ? "max-h-56 overflow-hidden" : ""}`}>
                        <HighlightedText
                          text={text}
                          terms={terms}
                          className="max-w-prose text-sm leading-6 text-slate-800"
                        />
                        {collapsed ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent" />
                        ) : null}
                      </div>
                      {long || roomy ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {long ? (
                            <button type="button" className={linkButtonClass} onClick={() => toggleExpanded(question.id)}>
                              <ChevronDown className={`h-3.5 w-3.5 transition ${collapsed ? "" : "rotate-180"}`} />
                              {collapsed ? "Show full answer" : "Show less"}
                            </button>
                          ) : null}
                          <button type="button" className={linkButtonClass} onClick={() => openReader(index)}>
                            <Maximize2 className="h-3.5 w-3.5" />
                            Read in focus mode
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-slate-400">No answer written — scored 0 automatically</p>
                  )}
                </div>
                {guide ? <MarkingGuide modelAnswer={guide} terms={terms} covered={covered} /> : null}
              </div>

              <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                <ScorePicker
                  question={question}
                  value={draft.points}
                  disabled={saving}
                  onFocus={() => setFocusIndex(index)}
                  onChange={(value) => setDraft(question.id, { points: value })}
                />
                <NoteField
                  id={`note-${attempt.id}-${question.id}`}
                  value={draft.comment}
                  disabled={saving}
                  onFocus={() => setFocusIndex(index)}
                  onChange={(value) => setDraft(question.id, { comment: value })}
                  onQuickNote={(note) => addQuickNote(question.id, note)}
                />
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
          {saveBar}
        </div>
      ) : null}

      {readerQuestion && readerDraft ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${traineeName}'s answer to written question ${focusIndex + 1}`}
          className="fixed inset-0 z-50 flex bg-slate-950/50 p-2 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setReaderOpen(false);
            }
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  {traineeName} · Written {focusIndex + 1} of {writtenQuestions.length} · {readerQuestion.points} pt
                  {readerQuestion.points === 1 ? "" : "s"}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">{readerQuestion.prompt}</p>
              </div>
              <div className="flex items-center gap-1">
                <div role="group" aria-label="Text size" className="mr-1 flex overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <button
                    type="button"
                    aria-label="Smaller text"
                    disabled={readerSize === 0}
                    onClick={() => changeReaderSize(-1)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                  >
                    A−
                  </button>
                  <button
                    type="button"
                    aria-label="Larger text"
                    disabled={readerSize === READER_SIZES.length - 1}
                    onClick={() => changeReaderSize(1)}
                    className="border-l border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                  >
                    A+
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Previous answer"
                  title="Previous answer (←)"
                  disabled={focusIndex === 0}
                  onClick={() => focusQuestion(focusIndex - 1)}
                  className={iconButtonClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next answer"
                  title="Next answer (→)"
                  disabled={focusIndex === writtenQuestions.length - 1}
                  onClick={() => focusQuestion(focusIndex + 1)}
                  className={iconButtonClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Close focus mode"
                  title="Close (Esc)"
                  onClick={() => setReaderOpen(false)}
                  className={iconButtonClass}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
              <div key={readerQuestion.id} className="px-5 py-6 sm:px-10 lg:min-h-0 lg:overflow-y-auto">
                <div className="mx-auto max-w-prose">
                  <p className="whitespace-pre-line text-sm font-medium leading-6 text-slate-500">
                    {readerQuestion.prompt}
                  </p>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {traineeName}&apos;s answer · {countWords(readerText)} word{countWords(readerText) === 1 ? "" : "s"}
                  </p>
                  {readerText.trim() ? (
                    <HighlightedText
                      text={readerText}
                      terms={readerTerms}
                      className={`mt-2 text-slate-800 ${READER_SIZES[readerSize]}`}
                    />
                  ) : (
                    <p className="mt-2 italic text-slate-400">No answer written (scored 0 automatically)</p>
                  )}
                </div>
              </div>
              <aside className="grid content-start gap-4 border-t border-slate-200 bg-slate-50 p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
                {readerQuestion.modelAnswer?.trim() ? (
                  <MarkingGuide
                    modelAnswer={readerQuestion.modelAnswer.trim()}
                    terms={readerTerms}
                    covered={coveredTerms(readerText, readerTerms)}
                  />
                ) : (
                  <p className="text-xs text-slate-400">No marking guide for this question.</p>
                )}
                <ScorePicker
                  question={readerQuestion}
                  value={readerDraft.points}
                  disabled={saving}
                  onFocus={() => undefined}
                  onChange={(value) => setDraft(readerQuestion.id, { points: value })}
                />
                <NoteField
                  id={`reader-note-${attempt.id}-${readerQuestion.id}`}
                  value={readerDraft.comment}
                  disabled={saving}
                  rows={4}
                  alwaysOpen
                  onFocus={() => undefined}
                  onChange={(value) => setDraft(readerQuestion.id, { comment: value })}
                  onQuickNote={(note) => addQuickNote(readerQuestion.id, note)}
                />
                {focusIndex < writtenQuestions.length - 1 ? (
                  <button type="button" className={secondaryButtonClass} onClick={() => focusQuestion(focusIndex + 1)}>
                    Next written answer
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" className={secondaryButtonClass} onClick={() => setReaderOpen(false)}>
                    Done reading
                  </button>
                )}
              </aside>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              {saveBar}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
