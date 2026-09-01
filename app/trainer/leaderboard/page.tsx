"use client";

import { useEffect, useMemo, useState } from "react";
import { TrainerShell } from "@/components/trainer-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { getTrainerLeaderboard } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import { fieldClass } from "@/lib/ui/form-classes";
import { useAuth } from "@/providers/auth-provider";
import type { LeaderboardBoard } from "@/types/engagement";

export default function TrainerLeaderboardPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<LeaderboardBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    getTrainerLeaderboard()
      .then((payload) => {
        setBoards(payload.boards);
        const first = payload.boards[0];
        setSelected(first?.program.id ?? "");
        setBatchId(first?.batch?.id ?? "");
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError ? err.message : "Unable to load leaderboard");
      });
  }, []);

  useEffect(() => {
    if (!selected || !batchId) {
      return;
    }
    let cancelled = false;
    getTrainerLeaderboard(selected, batchId)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const next = payload.boards[0];
        if (!next) {
          return;
        }
        setBoards((current) => {
          if (!current) {
            return [next];
          }
          const without = current.filter(
            (board) => !(board.program.id === next.program.id && board.batch?.id === next.batch?.id),
          );
          return [...without, next];
        });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load leaderboard");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selected, batchId]);

  const programs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const board of boards ?? []) {
      seen.set(board.program.id, board.program.title);
    }
    return [...seen.entries()].map(([id, title]) => ({ id, title }));
  }, [boards]);

  const board =
    boards?.find((item) => item.program.id === selected && item.batch?.id === batchId) ??
    boards?.find((item) => item.program.id === selected) ??
    boards?.[0] ??
    null;
  const batches = board?.batches ?? [];

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Leaderboard" user={user}>
      {error ? <ErrorState message={error} /> : null}
      {boards === null && !error ? <LoadingState /> : null}
      {boards && boards.length === 0 ? (
        <EmptyState title="No batches yet" description="Leaderboards appear for each batch you operate." />
      ) : null}
      {boards && boards.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          {programs.length > 1 ? (
            <div className="flex-1">
              <label className="text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="program">
                Course
              </label>
              <select
                id="program"
                className={`${fieldClass} mt-1 max-w-sm`}
                value={selected}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelected(id);
                  const first = boards.find((item) => item.program.id === id);
                  setBatchId(first?.batch?.id ?? first?.batches?.[0]?.id ?? "");
                }}
              >
                {programs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {batches.length > 0 ? (
            <div className="flex-1">
              <label className="text-xs font-medium tracking-wide text-slate-500 uppercase" htmlFor="batch">
                Batch
              </label>
              <select
                id="batch"
                className={`${fieldClass} mt-1 max-w-sm`}
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
      {board ? (
        <LeaderboardBoardView
          board={board}
          tone="admin"
          subtitle={board.batch ? `${board.batch.name} · ranked within this batch` : undefined}
        />
      ) : null}
    </TrainerShell>
  );
}
