"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AdminPageHeader } from "@/features/admin/page-header";
import { BatchTrackerDetail } from "@/features/batch-tracker/tracker-detail";

export default function AdminBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [crumb, setCrumb] = useState<string | undefined>(undefined);
  return (
    <>
      <AdminPageHeader title="Batch Tracker" crumbLabel={crumb} />
      <BatchTrackerDetail role="admin" batchId={batchId} onLoaded={setCrumb} />
    </>
  );
}
