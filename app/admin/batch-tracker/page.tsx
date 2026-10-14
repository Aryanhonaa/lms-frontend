"use client";

import { Suspense } from "react";
import { LoadingState } from "@/components/ui/empty-state";
import { AdminPageHeader } from "@/features/admin/page-header";
import { BatchTrackerBoard } from "@/features/batch-tracker/tracker-board";

export default function AdminBatchTrackerPage() {
  return (
    <>
      <AdminPageHeader title="Batch Tracker" subtitle="Headcount, certification and handover for every NHT batch." />
      <Suspense fallback={<LoadingState label="Loading batches…" />}>
        <BatchTrackerBoard
          role="admin"
          basePath="/admin/batch-tracker"
          emptyHint="Batches appear here once trainers create them on a program's Trainees page."
        />
      </Suspense>
    </>
  );
}
