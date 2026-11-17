"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { getBatchTracker } from "@/lib/api/batch-tracker";
import {
  getTrainerAssessment,
  listTrainerAssessments,
  setAssessmentAnswerVisibility,
} from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { ReleaseAnswersDialog } from "@/features/assessments/release-answers-dialog";
import { cardClass, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import type { TrackerBatch } from "@/types/batch-tracker";
import type {
  TrainerAssessmentDetail,
  TrainerAssessmentRosterRow,
  TrainerAssessmentSummary,
} from "@/types/assessment";

type CourseOption = {
  id: string;
  title: string;
  batchId: string;
};

function message(error: unknown, fallback: string): string {
  return error instanceof ApiClientError ? error.message : fallback;
}

function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "—" : `${score}%`;
}

function isSubmitted(row: TrainerAssessmentRosterRow): boolean {
  return Boolean(row.latest && row.latest.status !== "IN_PROGRESS");
}

function statusFor(row: TrainerAssessmentRosterRow): {
  label: string;
  className: string;
} {
  if (!row.latest) {
    return { label: "Not started", className: "bg-slate-100 text-slate-600" };
  }
  if (row.latest.status === "IN_PROGRESS") {
    return { label: "In progress", className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" };
  }
  if (row.latest.needsReview) {
    return { label: "Submitted · needs grading", className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" };
  }
  return { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" };
}

function StepLabel({ number, label, active }: { number: number; label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${active ? "text-violet-700" : "text-slate-400"}`}>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {number}
      </span>
      {label}
    </span>
  );
}

export function AnswerVisibilityManager() {
  const [batches, setBatches] = useState<TrackerBatch[] | null>(null);
  const [batchId, setBatchId] = useState("");
  const [programId, setProgramId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [assessments, setAssessments] = useState<TrainerAssessmentSummary[] | null>(null);
  const [detail, setDetail] = useState<TrainerAssessmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBatchTracker("trainer")
      .then((payload) => {
        if (!cancelled) {
          setBatches(payload.batches);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBatches([]);
          setError(message(err, "Unable to load your batches"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBatch = batches?.find((batch) => batch.id === batchId) ?? null;
  const courses = useMemo<CourseOption[]>(() => {
    if (!selectedBatch) {
      return [];
    }
    const rows = selectedBatch.courses?.length
      ? selectedBatch.courses
      : [{ id: selectedBatch.program.id, title: selectedBatch.program.title, batchId: selectedBatch.id }];
    return rows.map((course) => ({
      id: course.id,
      title: course.title,
      batchId: course.batchId ?? selectedBatch.id,
    }));
  }, [selectedBatch]);
  const selectedCourse = courses.find((course) => course.id === programId) ?? null;

  useEffect(() => {
    if (!selectedCourse) {
      return;
    }
    let cancelled = false;
    listTrainerAssessments({ programId: selectedCourse.id, batchId: selectedCourse.batchId })
      .then((payload) => {
        if (!cancelled) {
          setAssessments(payload.assessments);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAssessments([]);
          setError(message(err, "Unable to load quizzes for this course"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse]);

  useEffect(() => {
    if (!quizId || !selectedCourse) {
      return;
    }
    let cancelled = false;
    getTrainerAssessment(quizId, { programId: selectedCourse.id, batchId: selectedCourse.batchId })
      .then((payload) => {
        if (!cancelled) {
          setDetail(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(message(err, "Unable to load trainee results"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, selectedCourse]);

  function chooseBatch(nextBatchId: string) {
    setBatchId(nextBatchId);
    setProgramId("");
    setQuizId("");
    setAssessments(null);
    setDetail(null);
    setError(null);
  }

  async function toggleVisibility(answersVisible: boolean) {
    if (!quizId || !selectedCourse) {
      return;
    }
    if (answersVisible) {
      setConfirmOpen(true);
      return;
    }
    await applyVisibility(false);
  }

  async function applyVisibility(answersVisible: boolean) {
    if (!quizId || !selectedCourse) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setAssessmentAnswerVisibility(quizId, {
        batchId: selectedCourse.batchId,
        answersVisible,
      });
      setDetail(
        await getTrainerAssessment(quizId, {
          programId: selectedCourse.id,
          batchId: selectedCourse.batchId,
        }),
      );
      setConfirmOpen(false);
    } catch (err: unknown) {
      setError(message(err, "Unable to update answer visibility"));
    } finally {
      setBusy(false);
    }
  }

  const submitted = detail?.roster.filter(isSubmitted).length ?? 0;
  const waiting = (detail?.roster.length ?? 0) - submitted;
  const graded = detail?.roster.filter((row) => isSubmitted(row) && !row.latest?.needsReview).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm shadow-violet-600/20">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950">Release marked answers</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Select a batch, course, and quiz. Check who completed it and their marks, then release answers to the
                whole batch.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-end">
          <label className="block">
            <StepLabel number={1} label="Batch" active />
            <select
              className={`${fieldClass} mt-2`}
              value={batchId}
              onChange={(event) => chooseBatch(event.target.value)}
            >
              <option value="">Select a batch</option>
              {(batches ?? []).map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code ? `${batch.code} · ` : ""}
                  {batch.name}
                </option>
              ))}
            </select>
          </label>

          <ChevronRight className="mb-3 hidden h-5 w-5 text-slate-300 lg:block" />

          <label className="block">
            <StepLabel number={2} label="Course" active={Boolean(batchId)} />
            <select
              className={`${fieldClass} mt-2`}
              value={programId}
              disabled={!batchId}
              onChange={(event) => {
                setProgramId(event.target.value);
                setQuizId("");
                setAssessments(null);
                setDetail(null);
              }}
            >
              <option value="">{batchId ? "Select a course" : "Select a batch first"}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          <ChevronRight className="mb-3 hidden h-5 w-5 text-slate-300 lg:block" />

          <label className="block">
            <StepLabel number={3} label="Quiz or exam" active={Boolean(programId)} />
            <select
              className={`${fieldClass} mt-2`}
              value={quizId}
              disabled={!programId || assessments === null}
              onChange={(event) => {
                setQuizId(event.target.value);
                setDetail(null);
              }}
            >
              <option value="">
                {!programId ? "Select a course first" : assessments === null ? "Loading quizzes…" : "Select a quiz"}
              </option>
              {(assessments ?? []).map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title} · {assessment.location}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {batches === null && !error ? <LoadingState label="Loading your batches…" /> : null}
      {batches?.length === 0 && !error ? (
        <section className={`${cardClass} px-6 py-12 text-center`}>
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-900">No batches available</p>
          <p className="mt-1 text-sm text-slate-500">Create a batch and enroll trainees before releasing answers.</p>
        </section>
      ) : null}
      {programId && assessments?.length === 0 && !error ? (
        <section className={`${cardClass} px-6 py-12 text-center`}>
          <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-900">No quizzes in this course</p>
          <p className="mt-1 text-sm text-slate-500">Create a quiz in the course builder, then return here.</p>
        </section>
      ) : null}
      {quizId && !detail && !error ? <LoadingState label="Loading trainee results…" /> : null}

      {detail ? (
        <>
          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-950">{detail.assessment.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedBatch?.name} · {selectedCourse?.title} · pass mark {detail.assessment.passingScore}%
                </p>
              </div>
              {detail.summary.answersVisible ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busy}
                  onClick={() => void toggleVisibility(false)}
                >
                  <EyeOff className="h-4 w-4" />
                  {busy ? "Updating…" : "Hide answers"}
                </button>
              ) : (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={busy}
                  onClick={() => void toggleVisibility(true)}
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {busy ? "Releasing…" : "Show answers to batch"}
                </button>
              )}
            </div>

            <div className="grid gap-3 bg-slate-50/70 px-5 py-4 sm:grid-cols-4">
              <SummaryCard icon={Users} label="Trainees" value={detail.roster.length} />
              <SummaryCard icon={CheckCircle2} label="Submitted" value={`${submitted}/${detail.roster.length}`} tone="emerald" />
              <SummaryCard icon={Clock3} label="Still waiting" value={waiting} tone={waiting > 0 ? "amber" : "slate"} />
              <SummaryCard icon={GraduationCap} label="Marked" value={`${graded}/${detail.roster.length}`} tone="violet" />
            </div>

            <div
              className={`mx-5 my-4 rounded-xl px-4 py-3 text-sm ring-1 ${
                detail.summary.answersVisible
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : detail.summary.canRevealAnswers
                    ? "bg-violet-50 text-violet-900 ring-violet-200"
                    : "bg-amber-50 text-amber-900 ring-amber-200"
              }`}
            >
              {detail.summary.answersVisible
                ? "Answers are visible. Trainees were notified and can open their marked answer review."
                : detail.summary.canRevealAnswers
                  ? "Everyone has submitted. You can now release marked answers to the whole batch."
                  : `${waiting} trainee${waiting === 1 ? " has" : "s have"} not submitted yet. You can still release answers now; a confirmation will appear first.`}
            </div>

            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {detail.roster.map((row) => {
                const status = statusFor(row);
                return (
                  <li key={row.enrollmentId} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-50/70">
                    <UserAvatar name={row.trainee.name} size="row" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{row.trainee.name}</p>
                      <p className="truncate text-xs text-slate-500">{row.trainee.email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    <div className="w-24 text-right">
                      <p className="text-xs text-slate-400">Mark</p>
                      <p
                        className={`text-sm font-semibold ${
                          row.latest?.passed === true
                            ? "text-emerald-700"
                            : row.latest?.passed === false
                              ? "text-rose-700"
                              : "text-slate-700"
                        }`}
                      >
                        {formatScore(row.latest?.score)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}

      {batchId && programId && !quizId && assessments && assessments.length > 0 ? (
        <section className={`${cardClass} px-6 py-10 text-center`}>
          <CircleDashed className="mx-auto h-8 w-8 text-violet-300" />
          <p className="mt-3 font-medium text-slate-900">Select a quiz to view the trainee roster</p>
          <p className="mt-1 text-sm text-slate-500">You’ll see completion, grading status, and marks here.</p>
        </section>
      ) : null}

      <ReleaseAnswersDialog
        open={confirmOpen && Boolean(detail && selectedBatch && selectedCourse)}
        quizTitle={detail?.assessment.title ?? ""}
        batchName={selectedBatch?.name ?? ""}
        courseTitle={selectedCourse?.title}
        submittedCount={submitted}
        rosterCount={detail?.roster.length ?? 0}
        pendingCount={waiting}
        busy={busy}
        onClose={() => {
          if (!busy) {
            setConfirmOpen(false);
          }
        }}
        onConfirm={() => void applyVisibility(true)}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "amber" | "violet";
}) {
  const iconClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : tone === "violet"
          ? "bg-violet-100 text-violet-700"
          : "bg-slate-200 text-slate-600";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-950/5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
