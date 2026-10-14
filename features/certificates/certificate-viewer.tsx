"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Download, Link2, X } from "lucide-react";
import { CertificateArtwork, type CertificateArtworkData } from "./certificate-artwork";

const PRINT_CLASS = "printing-certificate";

export function printCertificate(certificate: CertificateArtworkData) {
  const style = document.createElement("style");
  style.textContent = "@page { size: A4 landscape; margin: 0; }";
  document.head.appendChild(style);
  document.documentElement.classList.add(PRINT_CLASS);
  const previousTitle = document.title;
  document.title = `${certificate.traineeName} - ${certificate.programTitle} - Certificate`;

  function cleanup() {
    style.remove();
    document.documentElement.classList.remove(PRINT_CLASS);
    document.title = previousTitle;
    window.removeEventListener("afterprint", cleanup);
  }

  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function CertificateViewer({
  certificate,
  onClose,
}: {
  certificate: CertificateArtworkData | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!certificate) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [certificate, onClose]);

  if (!certificate) {
    return null;
  }

  const verifyUrl =
    certificate.verificationUrl ??
    `${window.location.origin}/verify?id=${encodeURIComponent(certificate.certificateId)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const toolButton =
    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition duration-150";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Certificate for ${certificate.programTitle}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium text-white/90">{certificate.programTitle}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`${toolButton} bg-white/10 text-white hover:bg-white/20`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy verify link"}</span>
          </button>
          <button
            type="button"
            onClick={() => printCertificate(certificate)}
            className={`${toolButton} bg-white text-slate-900 hover:bg-violet-50`}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-white/80 transition duration-150 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 pb-6 sm:px-8" onClick={onClose}>
        <div
          className="w-full max-w-[min(72rem,calc((100vh-6rem)*1.414))] shadow-2xl shadow-black/40"
          onClick={(event) => event.stopPropagation()}
        >
          <CertificateArtwork certificate={certificate} />
        </div>
      </div>
      {createPortal(
        <div className="certificate-print-root" aria-hidden>
          <CertificateArtwork certificate={certificate} />
        </div>,
        document.body,
      )}
    </div>
  );
}
