"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { breadcrumbsForPath } from "@/lib/navigation/breadcrumbs";

export function PageBreadcrumb({ entityLabel, className = "mb-3" }: { entityLabel?: string; className?: string }) {
  const pathname = usePathname();
  const crumbs = breadcrumbsForPath(pathname, entityLabel);
  if (crumbs.length < 2) {
    return null;
  }

  const parent = crumbs[crumbs.length - 2];
  const current = crumbs[crumbs.length - 1];
  if (!parent || !current) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 text-sm ${className}`}>
      <Link
        href={parent.href}
        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium text-violet-700 transition duration-150 hover:bg-violet-50 hover:text-violet-800"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span>Back</span>
      </Link>
      <span className="px-1 text-slate-300" aria-hidden>
        |
      </span>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-slate-500">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden /> : null}
              {last ? (
                <span className="truncate font-medium text-slate-700" aria-current="page">
                  {current.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-violet-700">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
