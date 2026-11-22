"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/page-header";
import { BatchTrackerBoard } from "@/features/batch-tracker/tracker-board";

export default function AdminBatchTrackerPage() {
  return (
    <>
      <AdminPageHeader title="Batch Tracker" subtitle="Every batch first — open one to see its assigned courses." />
      <Suspense fallback={<LoadingState label="Loading batches…" />}>
        <BatchTrackerBoard
          role="admin"
          basePath="/admin/batch-tracker"
          emptyHint="Batches appear here once trainers create them in Batch Tracker."
        />
      </Suspense>
    </>
  );
}
