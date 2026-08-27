"use client";

import type { ReactNode } from "react";
import { RoleGate } from "@/components/role-gate";

export default function TrainerLayout({ children }: { children: ReactNode }) {
  return <RoleGate role="TRAINER">{children}</RoleGate>;
}
