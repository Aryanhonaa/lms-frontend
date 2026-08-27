"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { endUsageSession, getUsageConfig, sendUsageHeartbeat } from "@/lib/api/app-usage";
import { USAGE_HEARTBEAT_INTERVAL_MS, USAGE_INACTIVITY_THRESHOLD_MS } from "@/lib/usage-config";

export function UsageTracker() {
  const searchParams = useSearchParams();
  const lastActiveAt = useRef(Date.now());
  const [heartbeatMs, setHeartbeatMs] = useState(USAGE_HEARTBEAT_INTERVAL_MS);
  const [inactivityMs, setInactivityMs] = useState(USAGE_INACTIVITY_THRESHOLD_MS);

  useEffect(() => {
    let cancelled = false;
    getUsageConfig()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setHeartbeatMs(payload.config.heartbeatIntervalMs);
        setInactivityMs(payload.config.inactivityThresholdMs);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function markActive() {
      lastActiveAt.current = Date.now();
    }

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", markActive, options);
    window.addEventListener("keydown", markActive);
    window.addEventListener("scroll", markActive, options);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        markActive();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (Date.now() - lastActiveAt.current > inactivityMs) {
        return;
      }
      const programId = searchParams.get("programId") ?? undefined;
      void sendUsageHeartbeat(programId ? { programId } : {}).catch(() => {
        /* ignore heartbeat failures */
      });
    }, heartbeatMs);

    function onPageHide() {
      void endUsageSession().catch(() => {
        /* ignore */
      });
    }
    window.addEventListener("pagehide", onPageHide);

    const programId = searchParams.get("programId") ?? undefined;
    void sendUsageHeartbeat(programId ? { programId } : {}).catch(() => {
      /* ignore */
    });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("scroll", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [heartbeatMs, inactivityMs, searchParams]);

  return null;
}
