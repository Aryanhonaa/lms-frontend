"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { completeTraineeRequirement, listTraineeRequirements, startTraineeRequirement } from "@/lib/api/interventions";
import { ApiClientError } from "@/lib/api/client";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { IndividualRequirement } from "@/types/intervention";

function formatDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function TraineeRequirementsPage() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<IndividualRequirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return listTraineeRequirements().then((payload) => {
      setRequirements(payload.requirements);
      setError(null);
    });
  }

  useEffect(() => {
    load().catch((err: unknown) => {
      setError(err instanceof ApiClientError ? err.message : "Unable to load requirements");
    });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Your requirements" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {requirements === null && !error ? <LoadingState /> : null}
      {requirements && requirements.length === 0 ? (
        <EmptyState
          title="No extra requirements"
          description="If your trainer assigns extra work, it will show up here. It is private to you and your trainer."
        />
      ) : null}
      {requirements && requirements.length > 0 ? (
        <ul className="space-y-4">
          {requirements.map((item) => (
            <li key={item.id} className="bg-white px-5 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-base font-medium text-stone-950">{item.title}</h2>
                <span className="text-[11px] uppercase tracking-wide text-stone-500">{item.status}</span>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {item.type.replaceAll("_", " ").toLowerCase()} · {item.program.title} · {formatDate(item.deadline)}
              </p>
              <p className="mt-3 text-sm text-stone-800">{item.reason}</p>
              {item.trainerMessage ? (
                <p className="mt-2 text-sm text-stone-700">
                  <span className="text-stone-500">From {item.trainer.name}: </span>
                  {item.trainerMessage}
                </p>
              ) : null}
              {item.description ? <p className="mt-2 text-sm text-stone-600">{item.description}</p> : null}
              {item.status !== "COMPLETED" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.status === "PENDING" ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={busyId === item.id}
                      onClick={() => {
                        setBusyId(item.id);
                        void startTraineeRequirement(item.id)
                          .then(() => load())
                          .catch((err: unknown) => {
                            setError(err instanceof ApiClientError ? err.message : "Unable to start requirement");
                          })
                          .finally(() => setBusyId(null));
                      }}
                    >
                      Start
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={busyId === item.id}
                    onClick={() => {
                      setBusyId(item.id);
                      void completeTraineeRequirement(item.id)
                        .then(() => load())
                        .catch((err: unknown) => {
                          setError(err instanceof ApiClientError ? err.message : "Unable to complete requirement");
                        })
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Mark complete
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">Completed {formatDate(item.completedAt)}</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </TraineeShell>
  );
}
