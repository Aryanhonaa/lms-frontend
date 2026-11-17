"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { ProgramReview } from "@/features/approvals/program-review";
import { getTrainerProgram } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { programAllowsBuilder, programAllowsTrainerDelete } from "@/lib/programs/enrollment";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
import { DeleteProgramDialog, deleteCourseButtonClass } from "@/features/programs/delete-program-dialog";
import { DuplicateProgramDialog } from "@/features/programs/duplicate-program-dialog";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramTree } from "@/types/program";

export default function ProgramPreviewPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

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
      title="Course materials"
      user={user}
      crumbLabel={program?.title}
      actions={
        program ? (
          <div className="flex flex-wrap gap-2">
            {user.id === program.createdByUserId && programAllowsBuilder(program.status) ? (
              <Link href={`/trainer/programs/${program.id}/builder`} className={primaryButtonClass}>
                Open builder
              </Link>
            ) : null}
            <button type="button" className={secondaryButtonClass} onClick={() => setDuplicateOpen(true)}>
              Duplicate
            </button>
            {user.id === program.createdByUserId && programAllowsTrainerDelete(program.status) ? (
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
          {!programAllowsBuilder(program.status) ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-violet-50 px-5 py-4 ring-1 ring-violet-100">
              <p className="text-sm text-violet-900">
                This course is locked for editing while it&apos;s in review or live. To make next month&apos;s version,
                duplicate it, edit the copy and submit it for approval.
              </p>
              <button type="button" className={primaryButtonClass} onClick={() => setDuplicateOpen(true)}>
                Duplicate to edit
              </button>
            </div>
          ) : null}
          <ProgramReview program={program} viewer="trainer" />
        </div>
      ) : error ? null : (
        <p className="text-sm text-slate-500">Loading preview…</p>
      )}
      <DuplicateProgramDialog program={duplicateOpen && program ? program : null} onClose={() => setDuplicateOpen(false)} />
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
