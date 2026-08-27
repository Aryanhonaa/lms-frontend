"use client";

import { useHealth } from "@/hooks/use-health";

export function HealthStatus() {
  const { data, error, isLoading } = useHealth();

  if (isLoading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Checking API health…</p>;
  }

  if (error) {
    return (
      <p className="text-red-700 dark:text-red-400">
        API unreachable: {error}
      </p>
    );
  }

  return (
    <p className="text-emerald-700 dark:text-emerald-400">
      API status: {data?.status}
    </p>
  );
}
