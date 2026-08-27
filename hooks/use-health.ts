"use client";

import { useEffect, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { getHealth } from "@/lib/api/health";
import type { HealthStatus } from "@/types/api";

type HealthState = {
  data: HealthStatus | null;
  error: string | null;
  isLoading: boolean;
};

export function useHealth(): HealthState {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((health) => {
        if (!cancelled) {
          setData(health);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof ApiClientError ? err.message : "Unable to reach the API");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, isLoading };
}
