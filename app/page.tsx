"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { useAuth } from "@/providers/auth-provider";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(user ? getDashboardPath(user.role) : "/login");
  }, [isLoading, router, user]);

  return <p className="px-8 py-16 text-zinc-600 dark:text-zinc-400">Redirecting…</p>;
}
