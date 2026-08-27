"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { useAuth } from "@/providers/auth-provider";
import type { Role } from "@/types/domain";

type RoleGateProps = {
  role?: Role;
  roles?: Role[];
  children: ReactNode;
};

export function RoleGate({ role, roles, children }: RoleGateProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const allowedKey = (roles ?? (role ? [role] : [])).join("|");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!allowedKey.split("|").includes(user.role)) {
      router.replace(getDashboardPath(user.role));
    }
  }, [allowedKey, isLoading, router, user]);

  if (isLoading || !user || !allowedKey.split("|").includes(user.role)) {
    return <p className="px-8 py-16 text-zinc-600 dark:text-zinc-400">Checking session…</p>;
  }

  return children;
}
