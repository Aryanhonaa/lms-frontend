"use client";

import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { LeaderboardFilters } from "@/features/engagement/leaderboard-filters";
import { useLeaderboardPage } from "@/features/engagement/use-leaderboard-page";
import { useAuth } from "@/providers/auth-provider";

export default function TraineeLeaderboardPage() {
  const { user } = useAuth();
  const page = useLeaderboardPage("trainee");

  if (!user) {
    return null;
  }

  const showFilters = !page.loadingFilters && !page.empty && (page.batches.length > 1 || page.courses.length > 1);

  return (
    <TraineeShell title="Leaderboard" user={user}>
      {page.error ? <ErrorState message={page.error} /> : null}
      {page.loadingFilters ? <LoadingState /> : null}
      {page.empty ? (
        <EmptyState title="No board yet" description="When you are enrolled in a batch, your rank will appear here." />
      ) : null}
      {showFilters ? (
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
          viewerId={user.id}
          subtitle={
            page.board.batch
              ? `${page.board.batch.name} · ${page.board.program.title} · ranked within this course`
              : undefined
          }
        />
      ) : null}
    </TraineeShell>
  );
}
