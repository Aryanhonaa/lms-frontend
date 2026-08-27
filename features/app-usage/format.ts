export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) {
    return `${safe}s`;
  }
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export function todayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftYmd(date: string, period: "daily" | "weekly" | "monthly", delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  if (period === "daily") {
    next.setUTCDate(next.getUTCDate() + delta);
  } else if (period === "weekly") {
    next.setUTCDate(next.getUTCDate() + delta * 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + delta);
  }
  return next.toISOString().slice(0, 10);
}
