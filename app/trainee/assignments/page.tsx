"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TraineeShell } from "@/components/trainee-shell";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTraineeAssignments } from "@/lib/api/assignments";
import { ApiClientError } from "@/lib/api/client";
import { friendlyLockReason } from "@/lib/learning/ux";
import { traineePrimaryCtaClass, traineeSecondaryCtaClass } from "@/lib/ui/trainee";
import { useAuth } from "@/providers/auth-provider";
import type { AssignmentCatalog } from "@/types/assignment";

function statusLabel(status: string): string {
  if (status === "NOT_STARTED") {
    return "Not started";
  }
  if (status === "IN_PROGRESS") {
    return "Draft";
  }
  return status.replaceAll("_", " ");
}

export default function TraineeAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentCatalog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTraineeAssignments()
      .then((payload) => {
        setAssignments(payload.assignments);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load assignments");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Assignments" user={user}>
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-medium text-slate-900">Your assignments</h2>
        </div>
        {error ? (
          <div className="px-5 py-4">
            <ErrorState message={error} />
          </div>
        ) : null}
        {!assignments && !error ? (
          <div className="px-5">
            <LoadingState label="Loading assignments…" />
          </div>
        ) : null}
        {assignments && assignments.length === 0 && !error ? (
          <div className="px-5 py-6">
            <EmptyState title="No assignments yet" description="Assignments show up here as you move through your journey." />
          </div>
        ) : null}
        {assignments && assignments.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {assignments.map((item) => {
              const locked = item.assignment.status === "LOCKED";
              return (
              <li key={item.assignment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ContentTypeChip type="ASSIGNMENT" />
                    <span className="text-xs text-slate-500">{item.assignment.location}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{item.assignment.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.assignment.dueDate ? `Due ${new Date(item.assignment.dueDate).toLocaleDateString()}` : "No due date"}
                    {` · ${item.assignment.maxScore} points`}
                  </p>
                  {locked ? (
                    <p className="mt-1.5 text-sm text-slate-500">{friendlyLockReason(item.assignment.reason)}</p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {statusLabel(item.submission.status)}
                      {item.submission.isLate ? " · submitted late" : ""}
                    </p>
                  )}
                </div>
                <Link href={`/trainee/assignments/${item.assignment.id}`} className={locked ? traineeSecondaryCtaClass : traineePrimaryCtaClass}>
                  {locked
                    ? "Why it's locked"
                    : item.submission.status === "IN_PROGRESS"
                      ? "Continue assignment"
                      : item.submission.status === "NOT_STARTED"
                        ? "Start assignment"
                        : "Open assignment"}
                </Link>
              </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </TraineeShell>
  );
}
