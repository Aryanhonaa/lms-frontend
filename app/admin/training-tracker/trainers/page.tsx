"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerTrainersView } from "@/features/training-tracker/tracker-trainers";

export default function AdminTrackerTrainersPage() {
  return (
    <>
      <AdminPageHeader title="By trainer" subtitle="Who is sitting with which trainer." />
      <TrackerTrainersView />
    </>
  );
}
