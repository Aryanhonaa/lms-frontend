"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { TraineeShell } from "@/components/trainee-shell";
import { LearnReturnLink } from "@/components/learn-return-link";
import { ErrorState, LoadingState } from "@/components/ui/empty-state";
import { AssignmentWorkspace } from "@/features/assignments/assignment-workspace";
import { getTraineeAssignment } from "@/lib/api/assignments";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { AssignmentCatalog } from "@/types/assignment";

function AssignmentDetailClient() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId") ?? undefined;
  const [catalog, setCatalog] = useState<AssignmentCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTraineeAssignment(params.id, batchId)
      .then((payload) => {
        setCatalog(payload);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load assignment");
      });
  }, [params.id, batchId]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title={catalog?.assignment.title ?? "Assignment"} user={user} dense crumbLabel={catalog?.assignment.title}>
      <LearnReturnLink />
      {error ? (
        <div className="px-8 py-6">
          <ErrorState message={error} />
        </div>
      ) : null}
      {!catalog && !error ? (
        <div className="px-8">
          <LoadingState label="Loading assignment…" />
        </div>
      ) : null}
      {catalog ? (
        <AssignmentWorkspace
          key={`${catalog.submission.id ?? catalog.assignment.id}-${batchId ?? ""}`}
          catalog={catalog}
          batchId={batchId}
          onChange={setCatalog}
        />
      ) : null}
    </TraineeShell>
  );
}

export default function TraineeAssignmentDetailPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-zinc-600">Loading assignment…</p>}>
      <AssignmentDetailClient />
    </Suspense>
  );
}
