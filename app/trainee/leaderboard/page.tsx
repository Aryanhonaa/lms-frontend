"use client";

import { useEffect, useState } from "react";
import { TraineeShell } from "@/components/trainee-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { getTraineeLeaderboard } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { LeaderboardBoard } from "@/types/engagement";

function boardKey(board: LeaderboardBoard): string {
  return board.batch?.id ?? board.program.id;
}

export default function TraineeLeaderboardPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<LeaderboardBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    getTraineeLeaderboard()
      .then((payload) => {
        setBoards(payload.boards);
        setSelected(payload.boards[0] ? boardKey(payload.boards[0]) : "");
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load leaderboard");
      });
  }, []);

  if (!user) {
    return null;
  }

  const board = boards?.find((item) => boardKey(item) === selected) ?? boards?.[0] ?? null;

  return (
    <TraineeShell title="Leaderboard" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {boards === null && !error ? <LoadingState /> : null}
      {boards && boards.length === 0 ? (
        <EmptyState title="No board yet" description="When you are enrolled in a batch, your rank will appear here." />
      ) : null}
      {boards && boards.length > 1 ? (
        <div className="mb-4">
          <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="board">
            Batch
          </label>
          <select
            id="board"
            className="mt-1 w-full max-w-sm rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {boards.map((item) => (
              <option key={boardKey(item)} value={boardKey(item)}>
                {item.program.title}
                {item.batch ? ` — ${item.batch.name}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {board ? (
        <LeaderboardBoardView
          board={board}
          viewerId={user.id}
          subtitle={board.batch ? `${board.batch.name} · ranked within this batch` : undefined}
        />
      ) : null}
    </TraineeShell>
  );
}
