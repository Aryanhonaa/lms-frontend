"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CourseOutcomePanel } from "@/components/course-outcome";
import { TrainerShell } from "@/components/trainer-shell";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getEnrollmentProgress } from "@/lib/api/enrollments";
import { ApiClientError } from "@/lib/api/client";
import { courseOutcomeLabel, formatCourseDate } from "@/lib/learning/course-outcome";
import { useAuth } from "@/providers/auth-provider";
import type { ProgressView } from "@/types/progress";

type EnrollmentProgressPayload = {
  enrollmentId: string;
  enrolledAt: string;
  trainee: { id: string; name: string; email: string };
  batch: { id: string; name: string } | null;
  progress: ProgressView;
};

export default function TrainerTraineeCoursePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string; enrollmentId: string }>();
  const [payload, setPayload] = useState<EnrollmentProgressPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.enrollmentId) {
      return;
    }
    let cancelled = false;
    getEnrollmentProgress(params.enrollmentId)
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load trainee course details.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.enrollmentId]);

  if (!user) {
    return null;
  }

  const course = payload?.progress.course;
  const started = formatCourseDate(payload?.enrolledAt);
  const finished = formatCourseDate(course?.finishedAt ?? course?.lastActivityAt);

  return (
    <TrainerShell
      title={payload ? `${payload.trainee.name}` : "Trainee"}
      user={user}
      crumbLabel={payload?.trainee.name}
      actions={
        <Link href={`/trainer/programs/${params.id}/trainees`} className="text-sm font-medium text-violet-700">
          Back to trainees
        </Link>
      }
    >
      {error ? <ErrorState message={error} /> : null}
      {!payload && !error ? <LoadingState label="Loading trainee details..." /> : null}
      {payload && course ? (
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
            <p className="text-sm text-slate-500">Trainee</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{payload.trainee.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{payload.progress.program.title}</p>
            <div className="mt-4 max-w-md">
              <p className="mb-1.5 text-xs font-medium text-slate-500">Progress {Math.round(payload.progress.overall.percent)}%</p>
              <ProgressBar value={payload.progress.overall.percent} tone="violet" size="md" />
            </div>
            <div className="mt-4">
              <CourseOutcomePanel course={course} />
              {course.outcome === "PENDING" ? (
                <p className="text-sm text-slate-600">
                  Course status: {courseOutcomeLabel(course.outcome, payload.progress.overall.percent)}
                </p>
              ) : null}
            </div>
          </section>

          {course.failedAssessments.length > 0 || course.outcome === "FAILED" ? (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
              <h3 className="text-sm font-semibold text-slate-900">Assessment Results</h3>
              {course.failedAssessments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No failed assessments recorded.</p>
              ) : (
                <ul className="mt-3 space-y-3 text-sm">
                  {course.failedAssessments.map((row) => (
                    <li key={row.id} className="rounded-xl bg-rose-50 px-3 py-3 text-rose-900">
                      <p className="font-medium">{row.title}</p>
                      <p className="mt-1 text-rose-800">
                        {row.score ?? 0}% / {row.passingScore}% · Attempts {row.attemptsUsed}
                        {row.maxAttempts != null ? ` / ${row.maxAttempts}` : ""} · Did not pass
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-950/5">
            <h3 className="text-sm font-semibold text-slate-900">Course Timeline</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Started</dt>
                <dd className="text-slate-900">{started ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Finished</dt>
                <dd className="text-slate-900">{course.courseStatus === "FINISHED" ? finished ?? "—" : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Outcome</dt>
                <dd className="text-slate-900">{courseOutcomeLabel(course.outcome, payload.progress.overall.percent)}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
    </TrainerShell>
  );
}
