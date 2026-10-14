"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTraineeCertificates } from "@/lib/api/certificates";
import { ApiClientError } from "@/lib/api/client";
import {
  CertificateArtwork,
  artworkFromOwned,
  type CertificateArtworkData,
} from "@/features/certificates/certificate-artwork";
import { CertificateViewer } from "@/features/certificates/certificate-viewer";
import { COURSE_REVIEW_CHECK_EVENT } from "@/lib/course-review";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui/form-classes";
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
  const [viewing, setViewing] = useState<CertificateArtworkData | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

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
        <ul className="grid gap-6 md:grid-cols-2">
          {certificates.map((item) => {
            const artwork = artworkFromOwned(item);
            return (
              <li
                key={item.certificateId}
                className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5"
              >
                <button
                  type="button"
                  onClick={() => setViewing(artwork)}
                  className="group block w-full bg-slate-100/70 p-4 text-left"
                  aria-label={`Open certificate for ${item.program.title}`}
                >
                  <div className="shadow-md ring-1 ring-slate-950/5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
                    <CertificateArtwork certificate={artwork} />
                  </div>
                </button>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-slate-900">{item.program.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {item.status === "VALID" ? "Completed" : "Revoked ·"} {formatWhen(item.completionDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* <Link href={`/verify?id=${encodeURIComponent(item.certificateId)}`} className={secondaryButtonClass}>
                      Verify
                    </Link> */}
                    <button type="button" className={primaryButtonClass} onClick={() => setViewing(artwork)}>
                      View
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <CertificateViewer certificate={viewing} onClose={closeViewer} />
    </TraineeShell>
  );
}
