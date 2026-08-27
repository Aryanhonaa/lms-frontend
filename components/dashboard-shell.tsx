"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

type NavLink = {
  href: string;
  label: string;
};

type DashboardShellProps = {
  title: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  nav?: NavLink[];
  actions?: ReactNode;
  dense?: boolean;
  children: ReactNode;
};

export function DashboardShell({
  title,
  roleLabel,
  userName,
  userEmail,
  nav,
  actions,
  dense = false,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col bg-[#f6f5f1]">
      <header className="border-b border-stone-200 bg-white">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{roleLabel}</p>
            <h1 className="text-xl font-semibold text-stone-950">{title}</h1>
            {nav && nav.length > 0 ? (
              <nav className="mt-3 flex flex-wrap gap-1" aria-label="Section">
                {nav.map((item) => {
                  const isRoot = item.href === "/trainer" || item.href === "/admin" || item.href === "/trainee";
                  const active = pathname === item.href || (!isRoot && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-2.5 py-1 text-sm ${
                        active ? "bg-stone-100 font-medium text-stone-950" : "text-stone-600 hover:bg-stone-50 hover:text-stone-950"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <div className="text-left sm:text-right">
              <p className="text-sm font-medium text-stone-900">{userName}</p>
              <p className="text-xs text-stone-500">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className={dense ? "flex min-h-0 flex-1 flex-col" : "flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8"}>
        {children}
      </main>
    </div>
  );
}
