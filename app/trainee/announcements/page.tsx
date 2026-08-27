"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { AnnouncementList } from "@/features/engagement/announcement-list";
import { listAnnouncements } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { AnnouncementItem } from "@/types/engagement";

export default function TraineeAnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AnnouncementItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAnnouncements("trainee")
      .then((payload) => {
        setItems(payload.announcements);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load announcements");
      });
  }, []);

  if (!user) {
    return null;
  }

  return (
    <TraineeShell title="Announcements" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {items === null && !error ? <LoadingState /> : null}
      <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
        {items && items.length === 0 ? (
          <EmptyState title="No announcements yet" description="Program and platform notes for trainees will appear here." />
        ) : null}
        {items ? <AnnouncementList announcements={items} /> : null}
      </section>
    </TraineeShell>
  );
}
