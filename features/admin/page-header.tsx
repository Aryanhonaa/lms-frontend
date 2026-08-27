import type { ReactNode } from "react";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  crumbLabel,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbLabel?: string;
}) {
  return (
    <div className="mb-6">
      <PageBreadcrumb entityLabel={crumbLabel} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
