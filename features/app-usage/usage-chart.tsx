"use client";

import { useMemo, useState } from "react";
import { formatDuration } from "@/features/app-usage/format";

const COLORS = [
  "#6d28d9",
  "#0284c7",
  "#059669",
  "#d97706",
  "#c026d3",
  "#e11d48",
  "#4f46e5",
  "#0f766e",
  "#ea580c",
  "#334155",
  "#0891b2",
  "#65a30d",
];

type Series = {
  id: string;
  name: string;
  values: number[];
};

export function UsageChart({
  labels,
  series,
  mode,
}: {
  labels: string[];
  series: Series[];
  mode: "comparison" | "individual";
}) {
  const [hover, setHover] = useState<{ series: string; index: number; x: number; y: number } | null>(null);
  const max = Math.max(1, ...series.flatMap((row) => row.values));
  const width = Math.max(420, labels.length * (series.length > 1 ? 42 : 36) + 72);
  const height = 260;
  const pad = { top: 16, right: 12, bottom: 48, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const ticks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, index) => Math.round((max / steps) * index));
  }, [max]);

  const grouped = mode === "comparison" && series.length > 1 && labels.length > 1;
  const groupWidth = innerW / Math.max(labels.length, 1);
  const barWidth = grouped
    ? Math.max(4, (groupWidth * 0.7) / Math.max(series.length, 1))
    : Math.max(10, groupWidth * 0.45);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        role="img"
        aria-label="App usage time chart"
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 min-w-full"
      >
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="10">
                {formatDuration(tick)}
              </text>
            </g>
          );
        })}
        {labels.map((label, index) => {
          const x = pad.left + groupWidth * index + groupWidth / 2;
          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={height - 16}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="10"
            >
              {label.length > 10 ? `${label.slice(0, 9)}…` : label}
            </text>
          );
        })}
        {series.map((row, seriesIndex) =>
          row.values.map((value, index) => {
            const color = series.length === 1 ? COLORS[index % COLORS.length] : COLORS[seriesIndex % COLORS.length];
            const barH = (value / max) * innerH;
            const x = grouped
              ? pad.left + groupWidth * index + (groupWidth - barWidth * series.length) / 2 + seriesIndex * barWidth
              : pad.left + groupWidth * index + (groupWidth - barWidth) / 2;
            const y = pad.top + innerH - barH;
            return (
              <rect
                key={`${row.id}-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(value > 0 ? 2 : 0, barH)}
                rx="3"
                fill={color}
                opacity={hover && (hover.series !== row.id || hover.index !== index) ? 0.45 : 1}
                onMouseEnter={(event) => {
                  const box = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({
                    series: row.id,
                    index,
                    x: event.clientX - box.left,
                    y: event.clientY - box.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${row.name}: ${formatDuration(value)}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: hover.x + 8, top: hover.y - 28 }}
        >
          {series.find((row) => row.id === hover.series)?.name} · {labels[hover.index]} ·{" "}
          {formatDuration(series.find((row) => row.id === hover.series)?.values[hover.index] ?? 0)}
        </div>
      ) : null}
      {series.length > 1 || (series.length === 1 && labels.length > 1 && series[0]?.id === "usage") ? (
        <div className="mt-3 flex flex-wrap gap-3">
          {series.length > 1
            ? series.map((row, index) => (
                <span key={row.id} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  {row.name}
                </span>
              ))
            : labels.map((label, index) => (
                <span key={`${label}-${index}`} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  {label}
                </span>
              ))}
        </div>
      ) : null}
    </div>
  );
}
