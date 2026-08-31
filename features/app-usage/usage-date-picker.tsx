"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { AppUsagePeriod } from "@/types/app-usage";
import { todayYmd } from "@/features/app-usage/format";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type CivilDate = { year: number; month: number; day: number };

function parseYmd(ymd: string): CivilDate {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year: year ?? 2000, month: month ?? 1, day: day ?? 1 };
}

function toYmd({ year, month, day }: CivilDate): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toLocalDate({ year, month, day }: CivilDate): Date {
  return new Date(year, month - 1, day);
}

function mondayOnOrBefore(date: CivilDate): CivilDate {
  const local = toLocalDate(date);
  const weekday = local.getDay();
  const diff = weekday === 0 ? 6 : weekday - 1;
  local.setDate(local.getDate() - diff);
  return { year: local.getFullYear(), month: local.getMonth() + 1, day: local.getDate() };
}

function addDays(date: CivilDate, delta: number): CivilDate {
  const next = toLocalDate(date);
  next.setDate(next.getDate() + delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1, day: next.getDate() };
}

function isSameDay(left: CivilDate, right: CivilDate): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function isInSelectedWeek(day: CivilDate, anchor: CivilDate): boolean {
  const monday = mondayOnOrBefore(anchor);
  const start = toLocalDate(monday).getTime();
  const end = toLocalDate(addDays(monday, 7)).getTime();
  const value = toLocalDate(day).getTime();
  return value >= start && value < end;
}

function isInSelectedMonth(day: CivilDate, anchor: CivilDate): boolean {
  return day.year === anchor.year && day.month === anchor.month;
}

type UsageDatePickerProps = {
  value: string;
  period: AppUsagePeriod;
  label?: string;
  onChange: (ymd: string) => void;
};

export function UsageDatePicker({ value, period, label, onChange }: UsageDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const today = parseYmd(todayYmd());
  const [cursor, setCursor] = useState(() => toLocalDate(selected));

  useEffect(() => {
    if (open) {
      setCursor(toLocalDate(selected));
    }
  }, [open, selected.year, selected.month, selected.day]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (!open) {
      return;
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function dayState(day: number) {
    const civil = { year, month: month + 1, day };
    const future = toLocalDate(civil).getTime() > toLocalDate(today).getTime();
    const picked = isSameDay(civil, selected);
    let inRange = false;
    if (period === "daily") {
      inRange = picked;
    } else if (period === "weekly") {
      inRange = isInSelectedWeek(civil, selected);
    } else {
      inRange = isInSelectedMonth(civil, selected);
    }
    return { civil, future, picked, inRange };
  }

  function selectDay(day: number) {
    const civil = { year, month: month + 1, day };
    if (toLocalDate(civil).getTime() > toLocalDate(today).getTime()) {
      return;
    }
    onChange(toYmd(civil));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex min-w-[9.5rem] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition duration-150 hover:border-slate-300 hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Choose date"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
        <span>{label ?? "—"}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[17.5rem] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-950/5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{monthLabel}</p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Next month"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                {weekday}
              </div>
            ))}
            {cells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} aria-hidden="true" className="h-8" />;
              }
              const state = dayState(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={state.future}
                  aria-pressed={state.picked}
                  aria-label={toYmd(state.civil)}
                  className={`h-8 rounded-lg text-xs font-medium transition duration-150 ${
                    state.future
                      ? "cursor-not-allowed text-slate-300"
                      : state.picked
                        ? "bg-violet-600 text-white shadow-sm"
                        : state.inRange
                          ? "bg-violet-50 text-violet-800 hover:bg-violet-100"
                          : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <p className="text-[11px] text-slate-500">
              {period === "daily" ? "Pick a day" : period === "weekly" ? "Pick a week" : "Pick a month"}
            </p>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
              onClick={() => {
                onChange(todayYmd());
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
