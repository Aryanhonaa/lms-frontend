"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTraineeAttendance } from "@/lib/api/attendance";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { TraineeAttendanceProgram } from "@/types/attendance";

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TraineeAttendancePage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TraineeAttendanceProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTraineeAttendance()
      .then((payload) => {
        setPrograms(payload.programs);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load attendance");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Attendance" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {programs === null && !error ? <LoadingState /> : null}
      {programs && programs.length === 0 ? (
        <EmptyState title="No attendance yet" description="When your trainer schedules live sessions, they will appear here." />
      ) : null}
      {programs && programs.length > 0 ? (
        <div className="space-y-6">
          {programs.map((item) => (
            <section key={item.enrollmentId} className="bg-white px-5 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-base font-medium text-stone-950">{item.program.title}</h2>
                <p className="text-sm text-stone-600">
                  {item.attendancePercent === null ? "No marked sessions" : `${item.attendancePercent}% attendance`}
                </p>
              </div>
              {item.upcoming.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Upcoming</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {item.upcoming.map((session) => (
                      <li key={session.id}>
                        {session.title} · {formatWhen(session.startsAt)}
                        {session.meetingLink ? ` · ${session.meetingLink}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Session history</p>
                {item.history.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">No past sessions.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-stone-100">
                    {item.history.map((row) => (
                      <li key={row.session.id} className="flex justify-between gap-3 py-2 text-sm">
                        <span>
                          {row.session.title} · {formatWhen(row.session.startsAt)}
                        </span>
                        <span className="uppercase tracking-wide text-stone-500">{row.status ? row.status.toLowerCase() : "unmarked"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </TraineeShell>
  );
}
