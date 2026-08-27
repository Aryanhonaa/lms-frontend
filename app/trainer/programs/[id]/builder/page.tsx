"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgramBuilder } from "@/features/programs/program-builder";
import { getTrainerProgram } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { programAllowsBuilder } from "@/lib/programs/enrollment";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramTree } from "@/types/program";

export default function ProgramBuilderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramTree | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }
    getTrainerProgram(params.id)
      .then((payload) => {
        if (!programAllowsBuilder(payload.program.status)) {
          router.replace(`/trainer/programs/${payload.program.id}`);
          return;
        }
        setProgram(payload.program);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load program");
      });
  }, [params.id, router]);

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="px-6 py-10">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!program) {
    return <LoadingState label="Opening builder…" />;
  }

  return <ProgramBuilder initialProgram={program} />;
}
