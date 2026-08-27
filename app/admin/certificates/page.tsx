"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/features/admin/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { listAdminCertificates, revokeCertificate } from "@/lib/api/certificates";
import { ApiClientError } from "@/lib/api/client";
import type { OwnedCertificate } from "@/types/certificate";

const CARD =
  "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<OwnedCertificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    listAdminCertificates()
      .then((payload) => {
        setCertificates(payload.certificates);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load certificates");
      });
  }

  useEffect(() => {
    reload();
  }, []);

  async function revoke(certificateId: string) {
    setBusyId(certificateId);
    try {
      await revokeCertificate(certificateId, "Revoked by administrator");
      reload();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : "Unable to revoke");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminPageHeader title="Certificates" subtitle="Issued records. Revocation is reflected immediately on public verification." />
      {error ? <ErrorState message={error} /> : null}
      {certificates === null && !error ? <LoadingState /> : null}
      {certificates && certificates.length === 0 ? (
        <EmptyState title="No certificates" description="Records are created automatically when a trainee becomes eligible." />
      ) : null}
      {certificates && certificates.length > 0 ? (
        <section className={CARD}>
          <ul className="divide-y divide-slate-100">
            {certificates.map((item) => (
              <li key={item.certificateId} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.traineeName} · {item.program.title}
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{item.certificateId}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatWhen(item.completionDate)} · {item.status.toLowerCase()} · {item.trainerName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/verify?id=${encodeURIComponent(item.certificateId)}`}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-800"
                  >
                    Verify
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={item.status === "REVOKED" || busyId === item.certificateId}
                    onClick={() => revoke(item.certificateId)}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
