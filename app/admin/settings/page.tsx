"use client";

import { Settings } from "lucide-react";
import { ComingSoon } from "@/features/admin/coming-soon";
import { AdminPageHeader } from "@/features/admin/page-header";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader title="Settings" subtitle="Workspace preferences for Super Admin." />
      <ComingSoon
        icon={Settings}
        title="Settings are coming later"
        description="Platform configuration will land here. For now, account access is managed through seeded users."
      />
    </>
  );
}
