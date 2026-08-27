"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [isLoading, router, user]);

  if (isLoading || user) {
    return <p className="px-8 py-16 text-sm text-stone-500">Loading…</p>;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Learning platform</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950">Sign in</h1>
        <p className="mt-2 mb-6 text-sm text-stone-600">Use the account assigned to you. Access is checked on every request.</p>
        <LoginForm />
        <p className="mt-6 text-sm text-stone-500">
          Have a certificate ID?{" "}
          <Link href="/verify" className="underline">
            Verify it
          </Link>
        </p>
      </div>
    </div>
  );
}
