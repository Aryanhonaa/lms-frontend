"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { BatchTrackerDetail } from "@/features/batch-tracker/tracker-detail";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerBatchDetailPage() {
  const { user } = useAuth();
  const { batchId } = useParams<{ batchId: string }>();
  const [crumb, setCrumb] = useState<string | undefined>(undefined);
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Batch Tracker" user={user} crumbLabel={crumb}>
      <BatchTrackerDetail role="trainer" batchId={batchId} onLoaded={setCrumb} />
    </TrainerShell>
  );
}
