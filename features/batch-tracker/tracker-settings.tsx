"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Users, X } from "lucide-react";
import {
  addHolidays,
  createTeam,
  getWorkCalendar,
  listTeams,
  removeHoliday,
  setWeeklyOffDays,
  updateTeam,
} from "@/lib/api/batch-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, fieldClass, primaryButtonClass } from "@/lib/ui/form-classes";
import type { LineOfBusiness, Team, WorkCalendarState } from "@/types/batch-tracker";
import { LobChip } from "./badges";
import { LOB_LABEL, formatDay } from "./format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function WorkCalendarSettings() {
  const [state, setState] = useState<WorkCalendarState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    getWorkCalendar("admin")
      .then((payload) => {
        if (!cancelled) {
          setState(payload);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorText(err, "Unable to load the work calendar."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: () => Promise<WorkCalendarState>) {
    setBusy(true);
    setError(null);
    try {
      setState(await action());
      return true;
    } catch (err: unknown) {
      setError(errorText(err, "Unable to save."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggleDay(day: number) {
    if (!state) {
      return;
    }
    const next = state.weeklyOffDays.includes(day)
      ? state.weeklyOffDays.filter((value) => value !== day)
      : [...state.weeklyOffDays, day].sort();
    void run(() => setWeeklyOffDays(next));
  }

  async function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !name.trim()) {
      return;
    }
    if (await run(() => addHolidays([{ date, name: name.trim() }]))) {
      setDate("");
      setName("");
    }
  }

  const todayYmd = new Date().toISOString().slice(0, 10);
  const upcoming = (state?.holidays ?? []).filter((row) => row.date >= todayYmd);
  const past = (state?.holidays ?? []).filter((row) => row.date < todayYmd);

  return (
    <section className={cardClass}>
      <SectionHeader
        icon={CalendarOff}
        title="Holidays & working days"
        subtitle="Training days skip these. Batch day counts and target dates update automatically."
      />
      <div className="space-y-5 px-5 py-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Weekly off</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => {
              const off = state?.weeklyOffDays.includes(day) ?? false;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={off}
                  disabled={!state || busy}
                  onClick={() => toggleDay(day)}
                  className={`w-12 rounded-lg py-1.5 text-sm transition duration-150 disabled:opacity-60 ${
                    off ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Public holidays</p>
          <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void onAdd(event)}>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} sm:max-w-44`}
              aria-label="Holiday date"
            />
            <input
              required
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dashain"
              className={fieldClass}
              aria-label="Holiday name"
            />
            <button type="submit" className={primaryButtonClass} disabled={busy || !state}>
              Add
            </button>
          </form>
          {state && state.holidays.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No holidays yet.</p>
          ) : null}
          {upcoming.length > 0 || past.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {[...upcoming, ...past].map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${row.date < todayYmd ? "text-slate-400" : ""}`}
                >
                  <span className="w-28 shrink-0 tabular-nums">{formatDay(row.date, true)}</span>
                  <span className={`flex-1 ${row.date < todayYmd ? "" : "text-slate-900"}`}>{row.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${row.name}`}
                    disabled={busy}
                    onClick={() => void run(() => removeHoliday(row.id))}
                    className="rounded-md p-1 text-slate-400 transition duration-150 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}

export function TeamSettings() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTeams("admin")
      .then((payload) => {
        if (!cancelled) {
          setTeams(payload.teams);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorText(err, "Unable to load teams."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    setTeams((await listTeams("admin")).teams);
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTeam({
        name,
        supervisorName: String(data.get("supervisorName") ?? "").trim() || undefined,
        lineOfBusiness: String(data.get("lineOfBusiness") ?? "") || null,
      });
      form.reset();
      await reload();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to add team."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(team: Team) {
    setBusy(true);
    setError(null);
    try {
      await updateTeam(team.id, { isActive: !team.isActive });
      await reload();
    } catch (err: unknown) {
      setError(errorText(err, "Unable to update team."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cardClass}>
      <SectionHeader icon={Users} title="Sales teams" subtitle="Certified trainees are handed over to these teams." />
      <div className="space-y-4 px-5 py-5">
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]" onSubmit={(event) => void onCreate(event)}>
          <input name="name" required maxLength={80} placeholder="Team name" className={fieldClass} aria-label="Team name" />
          <input
            name="supervisorName"
            maxLength={120}
            placeholder="Supervisor"
            className={fieldClass}
            aria-label="Supervisor"
          />
          <select name="lineOfBusiness" defaultValue="" className={fieldClass} aria-label="Type">
            <option value="">Any type</option>
            {(Object.keys(LOB_LABEL) as LineOfBusiness[]).map((value) => (
              <option key={value} value={value}>
                {LOB_LABEL[value]}
              </option>
            ))}
          </select>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            Add
          </button>
        </form>
        {teams === null && !error ? <p className="text-sm text-slate-500">Loading teams…</p> : null}
        {teams && teams.length === 0 ? <p className="text-sm text-slate-500">No teams yet.</p> : null}
        {teams && teams.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {teams.map((team) => (
              <li key={team.id} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${team.isActive ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    {team.name}
                    <LobChip value={team.lineOfBusiness} />
                  </p>
                  <p className="text-xs text-slate-500">
                    {[team.supervisorName || null, `${team.memberCount} handed over`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleActive(team)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition duration-150 hover:bg-slate-100"
                >
                  {team.isActive ? "Archive" : "Restore"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
