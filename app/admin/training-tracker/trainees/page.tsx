"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { TrackerTraineesView } from "@/features/training-tracker/tracker-trainees";

export default function AdminTrackerTraineesPage() {
  return (
    <>
      <AdminPageHeader title="People" subtitle="Everyone in a new-hire batch across the org. Trainers add people; you oversee the roster." />
      <TrackerTraineesView />
    </>
  );
}
