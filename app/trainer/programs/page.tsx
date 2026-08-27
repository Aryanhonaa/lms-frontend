"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrainerShell } from "@/components/trainer-shell";
import { ProgramList } from "@/features/programs/program-list";
import { DeleteProgramDialog } from "@/features/programs/delete-program-dialog";
import { listTrainerPrograms } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { primaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramSummary } from "@/types/program";

export default function TrainerProgramsPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProgramSummary | null>(null);

  useEffect(() => {
    listTrainerPrograms()
      .then((payload) => {
        setPrograms(payload.programs);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load programs");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell
      title="Programs"
      user={user}
      actions={
        <Link href="/trainer/programs/new" className={primaryButtonClass}>
          New program
        </Link>
      }
    >
      {error ? <p className="text-sm text-red-600">{error}</p> : <ProgramList programs={programs} onDelete={setPendingDelete} />}
      <DeleteProgramDialog
        program={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={(programId) => {
          setPrograms((current) => current.filter((row) => row.id !== programId));
          setPendingDelete(null);
        }}
      />
    </TrainerShell>
  );
}
