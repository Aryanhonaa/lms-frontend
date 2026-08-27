"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { getProgramAttendance, markSessionAttendance } from "@/lib/api/attendance";
import { addSession } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { AttendanceStatus, ProgramAttendancePayload } from "@/types/attendance";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export default function TrainerAttendancePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProgramAttendancePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});

  function load(sessionId?: string) {
    if (!params.id) {
      return Promise.resolve();
    }
    return getProgramAttendance(params.id, sessionId).then((payload) => {
      setData(payload);
      const next: Record<string, AttendanceStatus> = {};
      for (const row of payload.roster) {
        if (row.status) {
          next[row.enrollmentId] = row.status;
        }
      }
      setDraft(next);
      setError(null);
    });
  }

  useEffect(() => {
    if (!params.id) {
      return;
    }
    getProgramAttendance(params.id)
      .then((payload) => {
        setData(payload);
        const next: Record<string, AttendanceStatus> = {};
        for (const row of payload.roster) {
          if (row.status) {
            next[row.enrollmentId] = row.status;
          }
        }
        setDraft(next);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load attendance");
      });
  }, [params.id]);

  if (!user) {
    return null;
  }

  const selected = data?.sessions.find((session) => session.id === data.selectedSessionId) ?? null;

  return (
    <TrainerShell title="Attendance" user={user} crumbLabel={data?.program.title}>
      {error ? <ErrorState message={error} /> : null}
      {data === null && !error ? <LoadingState /> : null}

      {data ? (
        <div className="space-y-6">
          <section className="bg-white px-5 py-4">
            <h2 className="text-base font-medium text-stone-950">{data.program.title}</h2>
            <form
              className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const weekId = String(form.get("weekId") ?? "");
                const title = String(form.get("title") ?? "").trim();
                const date = String(form.get("date") ?? "");
                const startTime = String(form.get("startTime") ?? "");
                const endTime = String(form.get("endTime") ?? "");
                if (!weekId || !title || !date) {
                  return;
                }
                setBusy(true);
                void addSession(weekId, {
                  title,
                  date,
                  startTime: startTime || "09:00",
                  endTime: endTime || "10:00",
                  description: String(form.get("description") ?? ""),
                  meetingLink: String(form.get("meetingLink") ?? "") || null,
                })
                  .then(() => load())
                  .catch((err: unknown) => {
                    setError(err instanceof ApiClientError ? err.message : "Unable to create session");
                  })
                  .finally(() => setBusy(false));
              }}
            >
              <p className="sm:col-span-2 text-xs uppercase tracking-wide text-stone-500">New training session</p>
              <select name="weekId" required className={fieldClass} defaultValue={data.weeks[0]?.id ?? ""}>
                {data.weeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {week.title}
                  </option>
                ))}
              </select>
              <input name="title" required className={fieldClass} placeholder="Title" />
              <input name="date" type="date" required className={fieldClass} />
              <input name="startTime" type="time" className={fieldClass} defaultValue="09:00" />
              <input name="endTime" type="time" className={fieldClass} defaultValue="10:00" />
              <input name="meetingLink" className={fieldClass} placeholder="Meeting link" />
              <textarea name="description" className={`${fieldClass} sm:col-span-2`} placeholder="Description" rows={2} />
              <button type="submit" className={primaryButtonClass} disabled={busy || data.weeks.length === 0}>
                Create session
              </button>
            </form>
          </section>

          {data.sessions.length === 0 ? (
            <EmptyState title="No sessions yet" description="Create a live session for a week, then mark who attended." />
          ) : (
            <>
              <section className="bg-white px-5 py-4">
                <label className="text-sm text-stone-700">
                  Session
                  <select
                    className={`${fieldClass} mt-1`}
                    value={data.selectedSessionId ?? ""}
                    onChange={(event) => {
                      void load(event.target.value).catch((err: unknown) => {
                        setError(err instanceof ApiClientError ? err.message : "Unable to load session");
                      });
                    }}
                  >
                    {data.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} · {session.date} {session.startTime}
                      </option>
                    ))}
                  </select>
                </label>
                {selected ? (
                  <p className="mt-2 text-sm text-stone-500">
                    {selected.week.title} · {selected.startTime}–{selected.endTime}
                    {selected.meetingLink ? ` · ${selected.meetingLink}` : ""}
                  </p>
                ) : null}
              </section>

              <section className="bg-white">
                <div className="border-b border-stone-200 px-5 py-3 text-sm font-medium">Enrolled trainees</div>
                {data.roster.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-stone-500">No trainees enrolled yet.</p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {data.roster.map((row) => (
                      <li key={row.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                        <div>
                          <p className="font-medium text-stone-950">{row.trainee.name}</p>
                          <p className="text-xs text-stone-500">
                            {row.trainee.email} · {row.attendancePercent === null ? "No marked sessions" : `${row.attendancePercent}% attendance`}
                          </p>
                        </div>
                        <select
                          className={fieldClass}
                          value={draft[row.enrollmentId] ?? ""}
                          onChange={(event) => {
                            const status = event.target.value as AttendanceStatus;
                            setDraft((current) => ({ ...current, [row.enrollmentId]: status }));
                          }}
                        >
                          <option value="">Not marked</option>
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && data.roster.length > 0 ? (
                  <div className="border-t border-stone-200 px-5 py-3">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={busy}
                      onClick={() => {
                        const records = Object.entries(draft).map(([enrollmentId, status]) => ({ enrollmentId, status }));
                        if (records.length === 0) {
                          return;
                        }
                        setBusy(true);
                        void markSessionAttendance(selected.id, records)
                          .then((payload) => {
                            setData(payload);
                            setError(null);
                          })
                          .catch((err: unknown) => {
                            setError(err instanceof ApiClientError ? err.message : "Unable to save attendance");
                          })
                          .finally(() => setBusy(false));
                      }}
                    >
                      Save attendance
                    </button>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>
      ) : null}
    </TrainerShell>
  );
}
