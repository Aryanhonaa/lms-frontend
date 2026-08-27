"use client";

import { ApprovalsBoard } from "@/features/approvals/approvals-board";
import { AdminPageHeader } from "@/features/admin/page-header";
import { useAuth } from "@/providers/auth-provider";

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const isOps = user?.role === "ADMIN";

  return (
    <>
      <AdminPageHeader
        title={isOps ? "Approvals" : "Material Approvals"}
        subtitle="Open the full course, read the materials, then approve or send it back."
      />
      <ApprovalsBoard />
    </>
  );
}
