"use client";

import { GraduationCap } from "lucide-react";
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
    return <p className="px-8 py-16 text-center text-sm text-stone-500">Loading…</p>;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm shadow-violet-600/25">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-stone-950">Learn Lab</span>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
          Learn. Track. Grow.
        </h1>
        <p className="mt-3 text-base text-stone-600">Structured training for every role.</p>

        <div className="mt-8 w-full rounded-3xl bg-white px-6 py-8 text-left ring-1 ring-stone-200/80 md:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">Learning platform</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">Sign in</h2>
          <p className="mt-2 mb-6 text-sm text-stone-600">Use the account assigned to you.</p>
          <LoginForm />
          <p className="mt-6 text-sm text-stone-500">
            Have a certificate ID?{" "}
            <Link href="/verify" className="font-medium text-violet-700 underline hover:text-violet-800">
              Verify it
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
