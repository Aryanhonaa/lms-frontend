"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerBatchesView } from "@/features/training-tracker/tracker-batches";

export default function AdminTrackerBatchesPage() {
  return (
    <>
      <AdminPageHeader title="All batches" subtitle="Every new-hire group across trainers. Open a batch to inspect progress (view only)." />
      <TrackerBatchesView />
    </>
  );
}
