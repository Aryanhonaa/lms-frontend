"use client";

import { useEffect, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listTrainerCertificates } from "@/lib/api/certificates";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { OwnedCertificate } from "@/types/certificate";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrainerCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<OwnedCertificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainerCertificates()
      .then((payload) => {
        setCertificates(payload.certificates);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load certificates");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Certificates" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {certificates === null && !error ? <LoadingState /> : null}
      {certificates && certificates.length === 0 ? (
        <EmptyState title="None issued" description="Certificates appear here when trainees on your programs meet every eligibility rule." />
      ) : null}
      {certificates && certificates.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5">
          <ul className="divide-y divide-slate-100">
            {certificates.map((item) => (
              <li key={item.certificateId} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.traineeName} · {item.program.title}
                  </p>
                  <p className="mt-1 font-mono text-slate-600">{item.certificateId}</p>
                </div>
                <p className="text-slate-500">
                  {formatWhen(item.completionDate)} · {item.status.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </TrainerShell>
  );
}
