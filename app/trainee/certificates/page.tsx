"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTraineeCertificates } from "@/lib/api/certificates";
import { ApiClientError } from "@/lib/api/client";
import { COURSE_REVIEW_CHECK_EVENT } from "@/lib/course-review";
import { secondaryButtonClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { OwnedCertificate, PendingCourseReview } from "@/types/certificate";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function TraineeCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<OwnedCertificate[] | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingCourseReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listTraineeCertificates()
      .then((payload) => {
        setCertificates(payload.certificates);
        setPendingReviews(payload.pendingReviews ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load certificates");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onCheck() {
      load();
    }
    window.addEventListener(COURSE_REVIEW_CHECK_EVENT, onCheck);
    return () => window.removeEventListener(COURSE_REVIEW_CHECK_EVENT, onCheck);
  }, [load]);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Certificates" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {certificates === null && !error ? <LoadingState /> : null}
      {certificates && certificates.length === 0 && pendingReviews.length === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="When you complete a course, submit the required review to receive your digital certificate."
        />
      ) : null}
      {certificates && certificates.length === 0 && pendingReviews.length > 0 ? (
        <EmptyState
          title="Review required"
          description="Submitting your review is required to receive your certificate. Complete the course review pop-up to unlock it."
        />
      ) : null}
      {certificates && certificates.length > 0 ? (
        <ul className="grid gap-4">
          {certificates.map((item) => (
            <li key={item.certificateId} className="bg-white px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    {item.status === "VALID" ? "Certificate" : "Revoked"}
                  </p>
                  <h2 className="mt-1 text-lg font-medium text-stone-950">{item.program.title}</h2>
                  <p className="mt-2 font-mono text-sm text-stone-800">{item.certificateId}</p>
                  <p className="mt-2 text-sm text-stone-600">Completed {formatWhen(item.completionDate)}</p>
                </div>
                <Link
                  href={`/verify?id=${encodeURIComponent(item.certificateId)}`}
                  className={secondaryButtonClass}
                >
                  Verify
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </TraineeShell>
  );
}
