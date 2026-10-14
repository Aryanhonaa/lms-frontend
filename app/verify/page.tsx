"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { CertificateArtwork } from "@/features/certificates/certificate-artwork";
import { verifyCertificate } from "@/lib/api/certificates";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import { RequiredMark } from "@/components/ui/required-mark";
import type { PublicCertificate } from "@/types/certificate";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function VerifyForm() {
  const searchParams = useSearchParams();
  const preset = searchParams.get("id") ?? "";
  const [certificateId, setCertificateId] = useState(preset);
  const [result, setResult] = useState<PublicCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(id: string) {
    const trimmed = id.trim();
    if (!trimmed) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await verifyCertificate(trimmed);
      setResult(payload.certificate);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof ApiClientError ? err.message : "Unable to verify this certificate");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = searchParams.get("id") ?? "";
    if (!id) {
      return;
    }
    setCertificateId(id);
    void lookup(id);
  }, [searchParams]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void lookup(certificateId);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="w-full max-w-lg bg-white px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Public verification</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950">Verify a certificate</h1>
        <p className="mt-2 mb-6 text-sm text-stone-600">
          Enter the certificate ID. This check does not require an account and never shows private scores or emails.
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="certificateId">
              Certificate ID
              <RequiredMark />
            </label>
            <input
              id="certificateId"
              className={`${fieldClass} mt-1 font-mono`}
              value={certificateId}
              onChange={(event) => setCertificateId(event.target.value)}
              placeholder="LMS-XXXXXXXXXXXX"
              autoComplete="off"
            />
          </div>
          <button type="submit" className={primaryButtonClass} disabled={loading || !certificateId.trim()}>
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>
        {error ? (
          <p role="alert" className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <p className="mt-6 text-sm text-stone-500">
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
      {result ? (
        <div className="w-full max-w-4xl">
          {result.status === "VALID" ? (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              Authentic certificate issued to {result.traineeName} for {result.program} on{" "}
              {formatWhen(result.completionDate)}.
            </p>
          ) : (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
              <ShieldX className="h-5 w-5 shrink-0 text-red-600" />
              This certificate has been revoked and is no longer valid.
            </p>
          )}
          <div className="shadow-xl ring-1 ring-slate-950/5">
            <CertificateArtwork
              certificate={{
                certificateId: result.certificateId,
                traineeName: result.traineeName,
                programTitle: result.program,
                trainerName: result.trainer,
                completionDate: result.completionDate,
                status: result.status,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="px-8 py-16 text-sm text-stone-500">Loading…</p>}>
      <VerifyForm />
    </Suspense>
  );
}
