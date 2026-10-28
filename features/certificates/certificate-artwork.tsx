import Image from "next/image";
import localFont from "next/font/local";
import type { CertificateStatus, OwnedCertificate } from "@/types/certificate";

const headingFont = localFont({
  src: [
    { path: "./fonts/CormorantGaramond-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/CormorantGaramond-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
});
const scriptFont = localFont({
  src: "./fonts/PinyonScript-Regular.woff2",
  weight: "400",
  display: "swap",
});

const MAROON = "#7a1f24";
const GOLD = "#e3cb8f";

export type CertificateArtworkData = {
  certificateId: string;
  traineeName: string;
  programTitle: string;
  trainerName: string;
  completionDate: string;
  issuedAt?: string;
  status: CertificateStatus;
  verificationUrl?: string;
};

export function artworkFromOwned(item: OwnedCertificate): CertificateArtworkData {
  return {
    certificateId: item.certificateId,
    traineeName: item.traineeName,
    programTitle: item.program.title,
    trainerName: item.trainerName,
    completionDate: item.completionDate,
    issuedAt: item.issuedAt,
    status: item.status,
    verificationUrl: item.verificationUrl,
  };
}

function longDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Short "host/verify" form of the verification link, printed so a paper copy can still be checked. */
function verifyLabel(certificate: CertificateArtworkData): string | null {
  if (!certificate.verificationUrl) {
    return null;
  }
  try {
    const url = new URL(certificate.verificationUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

function sizeFor(text: string, sizes: [number, string][], fallback: string): string {
  for (const [max, size] of sizes) {
    if (text.length <= max) {
      return size;
    }
  }
  return fallback;
}

/** Purple sweeps and the white oval, drawn on the same 1024×723 grid as the reference design. */
function Backdrop() {
  return (
    <svg
      viewBox="0 0 1024 723"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="1024" height="723" fill="#efe9fc" />
      <path d="M0 0 H330 Q120 120 0 330 Z" fill="#e4dafa" />
      <path d="M0 0 H232 Q80 70 0 236 Z" fill="#cdbbf6" />
      <path d="M0 0 H158 Q48 38 0 128 Z" fill="#8b5cf6" />
      <path d="M0 0 H92 Q22 22 0 70 Z" fill="#7c3aed" />

      <path d="M1024 380 V723 H640 Q900 640 1024 380 Z" fill="#e4dafa" />
      <path d="M1024 470 V723 H760 Q960 660 1024 470 Z" fill="#cdbbf6" />
      <path d="M1024 560 V723 H850 Q990 690 1024 560 Z" fill="#8b5cf6" />
      <path d="M1024 640 V723 H930 Q1010 712 1024 640 Z" fill="#7c3aed" />

      <ellipse cx="530" cy="360" rx="512" ry="420" transform="rotate(-13 530 360)" fill="#ffffff" />
    </svg>
  );
}

export function CertificateArtwork({ certificate }: { certificate: CertificateArtworkData }) {
  const revoked = certificate.status === "REVOKED";
  const nameSize = sizeFor(certificate.traineeName, [[18, "text-[6.6cqw]"], [28, "text-[5.4cqw]"]], "text-[4.3cqw]");
  const programSize = sizeFor(certificate.programTitle, [[48, "text-[1.7cqw]"], [80, "text-[1.4cqw]"]], "text-[1.2cqw]");

  return (
    <div className="@container w-full">
      <div className="relative aspect-[297/210] w-full overflow-hidden bg-white select-none">
        <div className={`absolute inset-0 ${revoked ? "grayscale" : ""}`}>
          <Backdrop />

          <div className="absolute inset-x-0 top-[6.1cqw] flex justify-center">
            <Image
              src="/certificate/entegra-logo.png"
              alt="Entegra Sources"
              width={736}
              height={192}
              loading="eager"
              className="h-auto w-[18cqw]"
            />
          </div>

          <div className={`${headingFont.className} absolute inset-x-0 top-[13.6cqw] text-center`} style={{ color: MAROON }}>
            <p className="text-[4.1cqw] leading-none font-semibold tracking-[0.07em]">CONGRATULATIONS</p>
            <p className="mt-[2.3cqw] flex items-center justify-center gap-[0.4cqw] text-[2.5cqw] leading-none font-semibold tracking-[0.01em]">
              <span className="h-[0.22cqw] w-[4.2cqw]" style={{ backgroundColor: GOLD }} />
              YOU ARE CERTIFIED
              <span className="h-[0.22cqw] w-[4.2cqw]" style={{ backgroundColor: GOLD }} />
            </p>
          </div>

          <div className="absolute inset-x-0 top-[27cqw] flex h-[10.6cqw] items-end justify-center px-[22cqw]">
            <p
              className={`${scriptFont.className} ${nameSize} text-center leading-[1.15] text-balance`}
              style={{ color: MAROON }}
            >
              {certificate.traineeName}
            </p>
          </div>
          <span
            className="absolute top-[37.9cqw] left-1/2 h-[0.18cqw] w-[43.6cqw] -translate-x-1/2"
            style={{ backgroundColor: GOLD }}
          />

          <p
            className={`${headingFont.className} absolute inset-x-[16cqw] top-[39.4cqw] line-clamp-2 text-center leading-snug text-balance lining-nums`}
            style={{ color: MAROON }}
          >
            <span className="text-[1.5cqw] italic">for successfully completing </span>
            <span className={`${programSize} font-semibold`}>{certificate.programTitle}</span>
          </p>

          <div className="absolute inset-x-0 top-[46cqw] flex justify-center">
            <Image
              src="/certificate/learnlab-logo.png"
              alt="Learn Lab"
              width={800}
              height={598}
              loading="eager"
              className="h-auto w-[11.8cqw]"
            />
          </div>

          <div className={`${headingFont.className} absolute inset-x-0 top-[58.2cqw] flex flex-col items-center lining-nums`}>
            <div className="flex items-center gap-[1cqw] rounded-[0.6cqw] border-[0.12cqw] px-[1.6cqw] py-[0.55cqw]" style={{ borderColor: GOLD }}>
              <span className="text-[1.05cqw] font-semibold tracking-[0.2em] uppercase" style={{ color: MAROON }}>
                Certificate No.
              </span>
              <span className="font-mono text-[1.45cqw] font-semibold tracking-[0.08em] text-slate-800">
                {certificate.certificateId}
              </span>
            </div>
            <p className="mt-[0.8cqw] text-[1.1cqw] font-medium tracking-[0.03em] text-slate-500">
              Completed {longDate(certificate.completionDate)}
              {verifyLabel(certificate) ? (
                <>
                  <span className="mx-[0.8cqw] text-slate-300">|</span>
                  Verify at <span className="text-slate-700">{verifyLabel(certificate)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {revoked ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/30">
            <span className="-rotate-12 rounded-[1.2cqw] border-[0.45cqw] border-red-500 bg-white/80 px-[3cqw] py-[0.8cqw] text-[5.5cqw] font-black tracking-[0.18em] text-red-500 uppercase">
              Revoked
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
