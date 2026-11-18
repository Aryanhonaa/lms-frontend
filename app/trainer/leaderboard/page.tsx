"use client";

import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { LeaderboardFilters } from "@/features/engagement/leaderboard-filters";
import { useLeaderboardPage } from "@/features/engagement/use-leaderboard-page";
import { useAuth } from "@/providers/auth-provider";

export default function TrainerLeaderboardPage() {
  const { user } = useAuth();
  const page = useLeaderboardPage("trainer");

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Leaderboard" user={user}>
      {page.error ? <ErrorState message={page.error} /> : null}
      {page.loadingFilters ? <LoadingState /> : null}
      {page.empty ? (
        <EmptyState title="No batches yet" description="Leaderboards appear for each batch you operate." />
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
    </TrainerShell>
  );
}
