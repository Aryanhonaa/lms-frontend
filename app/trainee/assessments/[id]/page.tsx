"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TraineeShell } from "@/components/trainee-shell";
import { LearnReturnLink } from "@/components/learn-return-link";
import { AssessmentTaker } from "@/features/assessments/assessment-taker";
import { getTraineeAssessment } from "@/lib/api/assessments";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { AssessmentCatalog } from "@/types/assessment";

export default function TraineeAssessmentDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<AssessmentCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTraineeAssessment(params.id)
      .then((payload) => {
        setCatalog(payload);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load assessment");
      });
  }, [params.id]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title={catalog?.assessment.title ?? "Quiz"} user={user} dense crumbLabel={catalog?.assessment.title}>
      <LearnReturnLink />
      {error ? <p className="px-8 py-6 text-sm text-red-600">{error}</p> : null}
      {catalog ? <AssessmentTaker catalog={catalog} onCatalogChange={setCatalog} /> : null}
    </TraineeShell>
  );
}
