"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const { logout } = useAuth();

  async function onSignOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => {
        void onSignOut();
      }}
      className={className ?? "rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"}
    >
      {children ?? "Sign out"}
    </button>
  );
}
