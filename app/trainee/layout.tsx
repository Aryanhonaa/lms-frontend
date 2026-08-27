"use client";

import type { ReactNode } from "react";
import { RoleGate } from "@/components/role-gate";

export default function TraineeLayout({ children }: { children: ReactNode }) {
  return <RoleGate role="TRAINEE">{children}</RoleGate>;
}
