"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TraineeCourseFilters } from "@/components/trainee-course-filters";
import { TraineeShell } from "@/components/trainee-shell";
import { LearnWorkspace } from "@/features/learning/learn-workspace";
import { useTraineeEnrollment } from "@/hooks/use-trainee-enrollment";
import { getTraineeLearnView } from "@/lib/api/learning";
import { ApiClientError } from "@/lib/api/client";
import {
  courseOptionsFromEnrollments,
  enrollmentFamilyId,
  familyEnrollments,
  journeyOptionsFromEnrollments,
  preferredEnrollment,
} from "@/lib/learning/enrollment-priority";
import { useAuth } from "@/providers/auth-provider";
import { isLearnPathType } from "@/lib/learning/path";
import { traineeCardClass, traineePrimaryCtaClass } from "@/lib/ui/trainee";
import type { LearnView } from "@/types/learning";

function LearnClient() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("programId") ?? "";
  const requestedBatch = searchParams.get("batchId") ?? "";
  const currentTypeRaw = searchParams.get("type");
  const currentType = isLearnPathType(currentTypeRaw) ? currentTypeRaw : null;
  const currentId = searchParams.get("id");
  const filters = useTraineeEnrollment({
    programId: requestedId || undefined,
    batchId: requestedBatch || undefined,
    preferAvailable: !requestedId,
  });
  const [view, setView] = useState<LearnView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replaceScope(programId: string, batchId: string, keepItem: boolean) {
    const params = new URLSearchParams();
    params.set("programId", programId);
    if (batchId) {
      params.set("batchId", batchId);
    }
    if (keepItem && currentType && currentId) {
      params.set("type", currentType);
      params.set("id", currentId);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (!filters.ready || !filters.programId) {
      return;
    }
    if (!requestedId) {
      const focus = preferredEnrollment(filters.enrollments) ?? filters.selected;
      if (focus) {
        replaceScope(focus.program.id, focus.batch?.id ?? filters.batchId, false);
        if (focus.program.id !== filters.programId) {
          filters.setProgramId(focus.program.id);
        }
        if (focus.batch?.id && focus.batch.id !== filters.batchId) {
          filters.setBatchId(focus.batch.id);
        }
      } else {
        replaceScope(filters.programId, filters.batchId, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync missing URL course once enrollments load
  }, [filters.ready, filters.programId, filters.batchId, requestedId, filters.enrollments]);

  useEffect(() => {
    if (!filters.ready || !filters.programId) {
      if (filters.ready && filters.enrollments.length === 0) {
        setView(null);
      }
      return;
    }
    if (filters.batches.length > 0 && !filters.batchId) {
      return;
    }
    let cancelled = false;
    getTraineeLearnView(filters.programId, filters.batchId || undefined)
      .then((payload) => {
        if (!cancelled) {
          setView(payload);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load learning view");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.ready, filters.programId, filters.batchId]);

  if (!user) {
    return null;
  }

  const loadError = error ?? filters.error;
  const selectedEnrollment =
    filters.enrollments.find(
      (row) =>
        row.program.id === filters.programId &&
        (!filters.batchId || row.batch?.id === filters.batchId),
    ) ?? filters.selected;
  const familyCourses = familyEnrollments(filters.enrollments, selectedEnrollment);
  const courseOptions = courseOptionsFromEnrollments(familyCourses);
  const journeys = journeyOptionsFromEnrollments(filters.enrollments);
  const journeyId = selectedEnrollment ? enrollmentFamilyId(selectedEnrollment) : "";

  function selectEnrollment(
    enrollment: (typeof filters.enrollments)[number],
    keepItem = false,
  ) {
    filters.setProgramId(enrollment.program.id);
    if (enrollment.batch?.id) {
      filters.setBatchId(enrollment.batch.id);
    }
    replaceScope(enrollment.program.id, enrollment.batch?.id ?? "", keepItem);
  }

  const toolbar = (
    <div className="space-y-3">
      {journeys.length > 1 ? (
        <div className="rounded-xl bg-violet-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">Active journey</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
            {journeys.find((journey) => journey.id === journeyId)?.name ?? "Your learning journey"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Choose a journey first, then continue its available course.
          </p>
        </div>
      ) : null}
      <TraineeCourseFilters
        programs={courseOptions}
        batches={[]}
        programId={filters.programId}
        batchId={filters.batchId}
        onProgramChange={(id) => {
          const next = familyCourses.find((row) => row.program.id === id);
          if (next && !next.sequenceLocked) {
            selectEnrollment(next);
          }
        }}
        onBatchChange={() => undefined}
        journeys={journeys}
        journeyId={journeyId}
        onJourneyChange={(nextJourneyId) => {
          const rows = filters.enrollments.filter(
            (row) => enrollmentFamilyId(row) === nextJourneyId,
          );
          const next = preferredEnrollment(rows) ?? rows[0];
          if (next) {
            selectEnrollment(next);
          }
        }}
      />
    </div>
  );

  return (
    <TraineeShell title={view?.program.title ?? "Learn"} user={user} dense hideHeader>
      {loadError ? (
        <div className="px-4 py-6 md:px-8">
          <div className={`${traineeCardClass} p-5`}>
            <p className="text-sm text-red-700">{loadError}</p>
          </div>
        </div>
      ) : null}
      {filters.ready && filters.enrollments.length === 0 && !loadError ? (
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className={`${traineeCardClass} max-w-md px-6 py-10 text-center`}>
            <p className="text-base font-semibold text-slate-900">Your journey starts soon</p>
            <p className="mt-2 text-sm text-slate-500">When you&apos;re enrolled in a course, today&apos;s mission will appear here.</p>
            <Link href="/trainee" className={`${traineePrimaryCtaClass} mt-5`}>
              Back to Home
            </Link>
          </div>
        </div>
      ) : null}
      {view ? (
        <LearnWorkspace
          view={view}
          batchId={filters.batchId || undefined}
          currentType={currentType}
          currentId={currentId}
          onViewChange={setView}
          toolbar={toolbar}
        />
      ) : null}
    </TraineeShell>
  );
}

export default function TraineeLearnPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-slate-500">Loading your journey…</p>}>
      <LearnClient />
    </Suspense>
  );
}
