"use client";

import { useParams } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerBatchDetailView } from "@/features/training-tracker/tracker-batch-detail";

export default function AdminTrackerBatchDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <>
      <AdminPageHeader title="Batch details" crumbLabel="Batch" />
      <TrackerBatchDetailView batchId={params.id} />
    </>
  );
}
