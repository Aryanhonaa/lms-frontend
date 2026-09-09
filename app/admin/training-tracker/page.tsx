"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerDashboardView } from "@/features/training-tracker/tracker-dashboard";

export default function AdminTrackerPage() {
  return (
    <>
      <AdminPageHeader
        title="Batches"
        subtitle="Org-wide view of new-hire batches. Trainers create batches and record scores; you oversee progress."
      />
      <TrackerDashboardView />
    </>
  );
}
