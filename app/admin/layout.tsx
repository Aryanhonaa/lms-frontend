"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { RoleGate } from "@/components/role-gate";
import { AdminShell } from "@/components/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate roles={["SUPER_ADMIN", "ADMIN"]}>
      <Suspense>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </RoleGate>
  );
}
