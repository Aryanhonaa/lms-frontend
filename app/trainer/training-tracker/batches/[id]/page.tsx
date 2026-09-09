"use client";

import { useParams } from "next/navigation";
import { TrainerShell } from "@/components/trainer-shell";
import { TrackerBatchDetailView } from "@/features/training-tracker/tracker-batch-detail";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerTrackerBatchDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  if (!user) {
    return null;
  }
  return (
    <TrainerShell title="Batch details" user={user} crumbLabel="Batch">
      <TrackerBatchDetailView batchId={params.id} />
    </TrainerShell>
  );
}
