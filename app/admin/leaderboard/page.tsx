"use client";

import { AdminPageHeader } from "@/features/admin/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { LeaderboardFilters } from "@/features/engagement/leaderboard-filters";
import { useLeaderboardPage } from "@/features/engagement/use-leaderboard-page";

export default function AdminLeaderboardPage() {
  const page = useLeaderboardPage("admin");

  return (
    <>
      <AdminPageHeader
        title="Leaderboard"
        subtitle="Pick a batch first, then a course in that batch. Peer rows never include raw scores."
      />
      {page.error ? <ErrorState message={page.error} /> : null}
      {page.loadingFilters ? <LoadingState /> : null}
      {page.empty ? (
        <EmptyState title="No boards" description="Approved programs with trainees will appear here." />
      ) : null}
      {!page.loadingFilters && !page.empty ? (
        <LeaderboardFilters
          batches={page.batches}
          courses={page.courses}
          batchId={page.batchId}
          programId={page.programId}
          onBatchChange={page.handleBatchChange}
          onCourseChange={page.handleCourseChange}
          disabled={page.loadingBoard}
        />
      ) : null}
      {page.loadingBoard ? <LoadingState /> : null}
      {!page.loadingBoard && page.board ? (
        <LeaderboardBoardView
          board={page.board}
          tone="admin"
          subtitle={
            page.board.batch
              ? `${page.board.batch.name} · ${page.board.program.title} · ranked within this course`
              : undefined
          }
        />
      ) : null}
    </>
  );
}
