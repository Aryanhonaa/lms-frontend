"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { AppUsagePanel } from "@/features/app-usage/app-usage-panel";

export default function AdminUsagePage() {
  return (
    <>
      <AdminPageHeader
        title="App Usage Time"
        subtitle="Active LMS time for trainees. Idle open tabs are not counted."
      />
      <AppUsagePanel audience="admin" />
    </>
  );
}
