"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { LeaderboardBoardView } from "@/features/engagement/leaderboard-board";
import { getAdminLeaderboard } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import type { LeaderboardBoard } from "@/types/engagement";

export default function AdminLeaderboardPage() {
  const [boards, setBoards] = useState<LeaderboardBoard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    getAdminLeaderboard()
      .then((payload) => {
        setBoards(payload.boards);
        setSelected(payload.boards[0]?.program.id ?? "");
        setBatchId(payload.boards[0]?.batch?.id ?? "");
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
    getAdminLeaderboard(selected, batchId)
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
          return current.map((board) => (board.program.id === next.program.id ? next : board));
        });
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

  const board =
    boards?.find((item) => item.program.id === selected && item.batch?.id === batchId) ??
    boards?.find((item) => item.program.id === selected) ??
    boards?.[0] ??
    null;
  const batches = board?.batches ?? [];

  return (
    <>
      <AdminPageHeader title="Leaderboard" subtitle="Blended rank across programs. Peer rows never include raw scores." />
      {error ? <ErrorState message={error} /> : null}
      {boards === null && !error ? <LoadingState /> : null}
      {boards && boards.length === 0 ? (
        <EmptyState title="No boards" description="Approved programs with trainees will appear here." />
      ) : null}
      {boards && boards.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          {boards.length > 1 ? (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="program">
                Program
              </label>
              <select
                id="program"
                className="mt-1 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  const first = boards.find((item) => item.program.id === event.target.value);
                  setBatchId(first?.batch?.id ?? first?.batches?.[0]?.id ?? "");
                }}
              >
                {boards.map((item) => (
                  <option key={item.program.id} value={item.program.id}>
                    {item.program.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {batches.length > 0 ? (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="batch">
                Batch
              </label>
              <select
                id="batch"
                className="mt-1 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
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
    </>
  );
}
