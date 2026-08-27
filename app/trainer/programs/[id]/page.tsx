"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { ProgramPreview } from "@/features/programs/program-preview";
import { getTrainerProgram } from "@/lib/api/programs";
import { updateInterventionSettings } from "@/lib/api/interventions";
import { ApiClientError } from "@/lib/api/client";
import { programAllowsBuilder, programAllowsEnrollment, programAllowsTrainerDelete } from "@/lib/programs/enrollment";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { DeleteProgramDialog, deleteCourseButtonClass } from "@/features/programs/delete-program-dialog";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramTree } from "@/types/program";

export default function ProgramPreviewPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    getTrainerProgram(params.id)
      .then((payload) => {
        setProgram(payload.program);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load program");
      });
  }, [params.id]);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell
      title="Program preview"
      user={user}
      crumbLabel={program?.title}
      actions={
        program ? (
          <div className="flex flex-wrap gap-2">
            {programAllowsEnrollment(program.status) ? (
              <Link href={`/trainer/programs/${program.id}/trainees`} className={primaryButtonClass}>
                Batches
              </Link>
            ) : null}
            <Link href={`/trainer/programs/${program.id}/attendance`} className={secondaryButtonClass}>
              Attendance
            </Link>
            {programAllowsBuilder(program.status) ? (
              <Link href={`/trainer/programs/${program.id}/builder`} className={primaryButtonClass}>
                Open builder
              </Link>
            ) : null}
            {programAllowsTrainerDelete(program.status) ? (
              <button type="button" className={deleteCourseButtonClass} onClick={() => setDeleteOpen(true)}>
                Delete
              </button>
            ) : null}
          </div>
        ) : null
      }
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {program ? (
        <div className="space-y-6">
          <section className="bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Intervention thresholds</p>
            <form
              className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const progressThreshold = Number(data.get("progressThreshold"));
                const examScoreThreshold = Number(data.get("examScoreThreshold"));
                void updateInterventionSettings(program.id, { progressThreshold, examScoreThreshold })
                  .then((payload) => {
                    setProgram((current) =>
                      current
                        ? {
                            ...current,
                            progressThreshold: payload.program.progressThreshold,
                            examScoreThreshold: payload.program.examScoreThreshold,
                          }
                        : current,
                    );
                    setSaved(true);
                    setError(null);
                  })
                  .catch((err: unknown) => {
                    setError(err instanceof ApiClientError ? err.message : "Unable to save thresholds");
                    setSaved(false);
                  });
              }}
            >
              <label className="text-sm text-stone-700">
                Progress %
                <input
                  name="progressThreshold"
                  type="number"
                  min={0}
                  max={100}
                  className={`${fieldClass} mt-1`}
                  defaultValue={Number(program.progressThreshold ?? 60)}
                />
              </label>
              <label className="text-sm text-stone-700">
                Exam score %
                <input
                  name="examScoreThreshold"
                  type="number"
                  min={0}
                  max={100}
                  className={`${fieldClass} mt-1`}
                  defaultValue={Number(program.examScoreThreshold ?? 60)}
                />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className={secondaryButtonClass}>
                  Save thresholds
                </button>
                {saved ? <span className="ml-3 text-sm text-stone-500">Saved</span> : null}
              </div>
            </form>
          </section>
          <ProgramPreview program={program} />
        </div>
      ) : error ? null : (
        <p className="text-sm text-zinc-600">Loading preview…</p>
      )}
      <DeleteProgramDialog
        program={deleteOpen && program ? program : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          router.replace("/trainer/programs");
        }}
      />
    </TrainerShell>
  );
}
