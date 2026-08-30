"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginLogo } from "@/components/learn-lab-logo";
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
        <LoginLogo width={240} />

       

        <div className="mt-8 w-full rounded-3xl bg-white px-6 py-8 text-left ring-1 ring-stone-200/80 md:px-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
