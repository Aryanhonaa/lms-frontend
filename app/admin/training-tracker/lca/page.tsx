"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerLcaView } from "@/features/training-tracker/tracker-lca";

export default function AdminTrackerLcaPage() {
  return (
    <>
      <AdminPageHeader title="Quality checks" subtitle="Weekly scores recorded by trainers. Average below 75% opens extra support." />
      <TrackerLcaView />
    </>
  );
}
