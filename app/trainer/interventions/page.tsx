"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import {
  assignRequirement,
  listTrainerInterventions,
  listTrainerRequirements,
  updateTrainerIntervention,
} from "@/lib/api/interventions";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { IndividualRequirement, IndividualRequirementType, InterventionFlag } from "@/types/intervention";

const REQUIREMENT_TYPES: IndividualRequirementType[] = [
  "VIDEO",
  "READING",
  "QUIZ",
  "ASSIGNMENT",
  "SESSION",
  "EXAM_RETRY",
  "CUSTOM",
];

function triggerLabel(trigger: InterventionFlag["trigger"]): string {
  return trigger === "PROGRESS_BELOW_THRESHOLD" ? "Progress below threshold" : "Exam score below threshold";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrainerInterventionsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<InterventionFlag[] | null>(null);
  const [requirements, setRequirements] = useState<IndividualRequirement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [flagPayload, requirementPayload] = await Promise.all([
      listTrainerInterventions(),
      listTrainerRequirements(),
    ]);
    setFlags(flagPayload.interventions);
    setRequirements(requirementPayload.requirements);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTrainerInterventions(), listTrainerRequirements()])
      .then(([flagPayload, requirementPayload]) => {
        if (cancelled) {
          return;
        }
        setFlags(flagPayload.interventions);
        setRequirements(requirementPayload.requirements);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load interventions");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openFlags = useMemo(() => flags?.filter((row) => row.status === "OPEN") ?? [], [flags]);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Interventions" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {flags === null && !error ? <LoadingState /> : null}
      {flags && flags.length === 0 ? (
        <EmptyState
          title="No intervention flags"
          description="When a trainee drops below the progress or exam threshold, they will appear here."
        />
      ) : null}

      {openFlags.length > 0 ? (
        <section className="mb-6 border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800">Needs attention</p>
          <p className="mt-1 text-sm text-red-900">{openFlags.length} open flag{openFlags.length === 1 ? "" : "s"}.</p>
        </section>
      ) : null}

      {flags && flags.length > 0 ? (
        <section className="bg-white">
          <div className="border-b border-stone-200 px-5 py-3 text-sm font-medium">Flags</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Trainee</th>
                  <th className="px-3 py-2 font-medium">Program</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Exam</th>
                  <th className="px-3 py-2 font-medium">Trigger</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-5 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {flags.map((flag) => (
                  <tr key={flag.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium text-stone-950">{flag.trainee.name}</p>
                      <p className="text-xs text-stone-500">{flag.trainee.email}</p>
                    </td>
                    <td className="px-3 py-3">{flag.program.title}</td>
                    <td className="px-3 py-3">{flag.progress ?? 0}%</td>
                    <td className="px-3 py-3">
                      {flag.examScore !== null ? `${flag.examScore}%` : "—"}
                      {flag.examTitle ? <span className="mt-1 block text-xs text-stone-500">{flag.examTitle}</span> : null}
                    </td>
                    <td className="px-3 py-3">{triggerLabel(flag.trigger)}</td>
                    <td className="px-3 py-3">{flag.status}</td>
                    <td className="px-3 py-3">{formatDate(flag.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {flag.status === "OPEN" ? (
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              void updateTrainerIntervention(flag.id, "ACKNOWLEDGED")
                                .then(() => reload())
                                .catch((err: unknown) => {
                                  setError(err instanceof ApiClientError ? err.message : "Unable to update flag");
                                })
                                .finally(() => setBusy(false));
                            }}
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {flag.status !== "RESOLVED" ? (
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              void updateTrainerIntervention(flag.id, "RESOLVED")
                                .then(() => reload())
                                .catch((err: unknown) => {
                                  setError(err instanceof ApiClientError ? err.message : "Unable to update flag");
                                })
                                .finally(() => setBusy(false));
                            }}
                          >
                            Resolve
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={primaryButtonClass}
                          onClick={() => setAssignFor(assignFor === flag.id ? null : flag.id)}
                        >
                          Assign
                        </button>
                      </div>
                      {assignFor === flag.id ? (
                        <form
                          className="mt-3 w-72 space-y-2 text-left"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const data = new FormData(event.currentTarget);
                            setBusy(true);
                            void assignRequirement({
                              enrollmentId: flag.enrollmentId,
                              interventionFlagId: flag.id,
                              type: String(data.get("type")) as IndividualRequirementType,
                              title: String(data.get("title") ?? "").trim(),
                              description: String(data.get("description") ?? ""),
                              trainerMessage: String(data.get("trainerMessage") ?? ""),
                              deadline: String(data.get("deadline") || "") || null,
                            })
                              .then(() => {
                                setAssignFor(null);
                                return reload();
                              })
                              .catch((err: unknown) => {
                                setError(err instanceof ApiClientError ? err.message : "Unable to assign requirement");
                              })
                              .finally(() => setBusy(false));
                          }}
                        >
                          <input name="title" required className={fieldClass} placeholder="Title" />
                          <select name="type" className={fieldClass} defaultValue="CUSTOM">
                            {REQUIREMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.replaceAll("_", " ").toLowerCase()}
                              </option>
                            ))}
                          </select>
                          <textarea name="trainerMessage" className={fieldClass} placeholder="Message to trainee" rows={3} />
                          <input name="deadline" type="date" className={fieldClass} />
                          <button type="submit" className={primaryButtonClass} disabled={busy}>
                            Save requirement
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {requirements.length > 0 ? (
        <section className="mt-6 bg-white">
          <div className="border-b border-stone-200 px-5 py-3 text-sm font-medium">Assigned requirements</div>
          <ul className="divide-y divide-stone-100">
            {requirements.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-950">{item.title}</p>
                  <p className="mt-1 text-stone-500">
                    {item.trainee.name} · {item.program.title} · {item.status.toLowerCase()}
                    {item.deadline ? ` · due ${formatDate(item.deadline)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-sm text-stone-500">
        Thresholds can be changed on each{" "}
        <Link href="/trainer/programs" className="underline">
          program
        </Link>
        .
      </p>
    </TrainerShell>
  );
}
