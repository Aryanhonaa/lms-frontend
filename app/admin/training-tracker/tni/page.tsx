"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerTniView } from "@/features/training-tracker/tracker-tni";

export default function AdminTrackerTniPage() {
  return (
    <>
      <AdminPageHeader title="Extra support" subtitle="See open support cases org-wide. Trainers run the plan; only you can confirm termination." />
      <TrackerTniView />
    </>
  );
}
