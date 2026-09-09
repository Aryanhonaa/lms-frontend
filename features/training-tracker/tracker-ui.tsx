"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { cardClass } from "@/lib/ui/form-classes";

export function trackerBase(pathname: string): "/admin/training-tracker" | "/trainer/training-tracker" {
  return pathname.startsWith("/admin") ? "/admin/training-tracker" : "/trainer/training-tracker";
}

const ADMIN_LINKS = [
  { href: "", label: "Overview" },
  { href: "/batches", label: "All batches" },
  { href: "/trainees", label: "People" },
  { href: "/trainers", label: "By trainer" },
  { href: "/lca", label: "Quality checks" },
  { href: "/tni", label: "Extra support" },
] as const;

const TRAINER_LINKS = [
  { href: "", label: "Overview" },
  { href: "/batches", label: "My batches" },
  { href: "/trainees", label: "People" },
  { href: "/lca", label: "Quality checks" },
  { href: "/tni", label: "Extra support" },
] as const;

export function TrackerSubnav() {
  const pathname = usePathname();
  const base = trackerBase(pathname);
  const { canOperate } = useTrackerCapabilities();
  const links = canOperate ? TRAINER_LINKS : ADMIN_LINKS;

  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {links.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className={`${cardClass} px-4 py-3`}>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function formatDay(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    JOINED: "Joined",
    IN_TRAINING: "In training",
    HR_ATTRITION: "Left in first 3 days",
    TRAINING_ATTRITION: "Did not pass training",
    EXAM_ELIGIBLE: "Ready for exam",
    EXAM_PENDING: "Exam pending",
    EXAM_FAILED: "Failed exam",
    CERTIFIED: "Certified",
    HANDOVER_PENDING: "Waiting for handover",
    HANDED_OVER: "Handed over",
    TNI: "Needs extra support",
    ACTIVE: "On the job",
    TERMINATED: "Terminated",
    ONGOING: "In training",
    COMPLETED: "Completed",
  };
  return labels[status] ?? status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function outcomeLabel(value: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    COMPLETED_CERTIFIED: "Completed & certified",
    COMPLETED_NOT_CERTIFIED: "Completed – not certified",
    LEFT_MID_BATCH: "Left mid-batch",
    TERMINATED: "Terminated",
  };
  return labels[value] ?? value;
}

export function completionLabel(value: string): string {
  const labels: Record<string, string> = {
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    LEFT: "Left",
    TERMINATED: "Terminated",
  };
  return labels[value] ?? value;
}

export function certificationLabel(value: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    CERTIFIED: "Certified",
    NOT_CERTIFIED: "Not certified",
    NOT_APPLICABLE: "N/A",
  };
  return labels[value] ?? value;
}

export function countPercentLabel(metric: { count: number; percent: number | null } | undefined): string {
  if (!metric) {
    return "0 · —";
  }
  return `${metric.count} · ${metric.percent === null || metric.percent === undefined ? "—" : `${metric.percent}%`}`;
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
