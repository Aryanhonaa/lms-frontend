"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppLogoIcon } from "@/components/learn-lab-logo";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeft,
  Search,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar, formatRoleLabel } from "@/components/user-avatar";
import { searchTrainerWorkspace } from "@/lib/api/trainer";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/types/api";
import type { TrainerSearchHit, TrainerSearchResults } from "@/types/trainer-dashboard";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const TRAINER_NAV: NavItem[] = [
  { href: "/trainer", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/trainer/programs", label: "Programs", icon: BookOpen },
  { href: "/trainer/trainees", label: "Trainees", icon: Users },
  { href: "/trainer/usage", label: "App Usage", icon: Clock3 },
  { href: "/trainer/assessments", label: "Quizzes", icon: ClipboardCheck },
  { href: "/trainer/assignments", label: "Assignments", icon: ListChecks },
  { href: "/trainer/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/trainer/interventions", label: "Needs help", icon: AlertTriangle },
  { href: "/trainer/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/trainer/announcements", label: "Announcements", icon: Megaphone },
  { href: "/trainer/certificates", label: "Certificates", icon: Award },
  { href: "/trainer/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/trainer/profile", label: "Profile", icon: User },
];

type TrainerShellProps = {
  title: string;
  user: AuthUser;
  actions?: ReactNode;
  hideHeader?: boolean;
  crumbLabel?: string;
  children: ReactNode;
};

function isActivePath(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

const EMPTY_SEARCH: TrainerSearchResults = {
  programs: [],
  trainees: [],
  assignments: [],
  assessments: [],
};

export function TrainerShell({ title, user: userProp, actions, hideHeader = false, crumbLabel, children }: TrainerShellProps) {
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const user = authUser ?? userProp;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(sessionStorage.getItem("lms-trainer-sidebar") === "1");
      setSidebarReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sidebarReady) {
      return;
    }
    sessionStorage.setItem("lms-trainer-sidebar", collapsed ? "1" : "0");
  }, [collapsed, sidebarReady]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarOpen(false);
      setProfileOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setSidebarOpen(false);
      setProfileOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onMenuClick = useCallback(() => {
    if (isDesktop()) {
      setCollapsed((open) => !open);
      return;
    }
    setSidebarOpen(true);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f6f7fb] text-slate-900">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-[260px] shrink-0 flex-col border-r border-slate-200/80 bg-[#f3f4f8] transition-[width,transform] duration-200 ease-out lg:static lg:h-full ${
          collapsed ? "lg:w-[76px]" : "lg:w-[260px]"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className={`flex items-center gap-3 px-5 py-5 ${collapsed ? "lg:justify-center lg:px-3" : ""}`}>
          <AppLogoIcon size={40} />
          <div className={collapsed ? "lg:hidden" : ""}>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Learn Lab</p>
            <p className="text-xs text-slate-500">Trainer</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Trainer">
          {TRAINER_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition duration-200 ${
                  active
                    ? "bg-violet-50 font-medium text-violet-700"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200/80 px-3 py-4">
          <button
            type="button"
            className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition duration-200 hover:bg-white hover:text-slate-900 lg:flex ${
              collapsed ? "justify-center px-0" : ""
            }`}
            onClick={() => setCollapsed((open) => !open)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span className={collapsed ? "lg:hidden" : ""}>Collapse</span>
          </button>
          <SignOutButton
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-white hover:text-slate-900 ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
          </SignOutButton>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            type="button"
            className="rounded-xl p-2 text-slate-600 transition duration-200 hover:bg-slate-50"
            onClick={onMenuClick}
            aria-label={sidebarOpen || !collapsed ? "Toggle sidebar" : "Open menu"}
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          <TrainerSearch />

          <NotificationBell role="trainer" allHref="/trainer/announcements" />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition duration-200 hover:bg-slate-50"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => {
                setProfileOpen((open) => !open);
              }}
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-sm font-medium text-slate-900">{user.name}</span>
                <span className="block text-xs text-slate-500">{formatRoleLabel(user.role)}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-950/5" role="menu">
                <p className="px-2 text-sm font-medium text-slate-900">{user.name}</p>
                <p className="px-2 text-xs text-slate-500">{user.email}</p>
                <p className="px-2 pt-1 text-xs text-slate-400">{formatRoleLabel(user.role)}</p>
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <Link
                    href="/trainer/profile"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition duration-150 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <SignOutButton className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition duration-150 hover:bg-slate-50">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </SignOutButton>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {!hideHeader ? (
            <div className="mb-6">
              <PageBreadcrumb entityLabel={crumbLabel} />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900">{title}</h1>
                {actions}
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

type FlatHit = TrainerSearchHit & { group: string };

function flattenResults(results: TrainerSearchResults): FlatHit[] {
  return [
    ...results.programs.map((item) => ({ ...item, group: "Programs" })),
    ...results.trainees.map((item) => ({ ...item, title: item.name ?? item.title, group: "Trainees" })),
    ...results.assignments.map((item) => ({ ...item, group: "Assignments" })),
    ...results.assessments.map((item) => ({ ...item, group: "Quizzes" })),
  ];
}

function TrainerSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TrainerSearchResults>(EMPTY_SEARCH);
  const [activeIndex, setActiveIndex] = useState(0);

  const hits = useMemo(() => flattenResults(results), [results]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchTrainerWorkspace(trimmed)
        .then((payload) => {
          if (controller.signal.aborted) {
            return;
          }
          setResults(payload);
          setError(null);
          setActiveIndex(0);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setResults(EMPTY_SEARCH);
          setError(err instanceof ApiClientError ? err.message : "Unable to search");
          setOpen(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const grouped = [
    { label: "Programs", items: results.programs },
    { label: "Trainees", items: results.trainees },
    { label: "Assignments", items: results.assignments },
    { label: "Quizzes", items: results.assessments },
  ].filter((group) => group.items.length > 0);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-xl">
      <form
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-inner"
        onSubmit={(event) => {
          event.preventDefault();
          if (hits[activeIndex]) {
            goTo(hits[activeIndex].href);
          }
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (!open || hits.length === 0) {
              if (event.key === "Escape") {
                setOpen(false);
              }
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % hits.length);
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search programs, trainees, assignments..."
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </form>

      {open && query.trim().length >= 2 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-auto rounded-2xl bg-white py-2 shadow-xl ring-1 ring-slate-950/5"
        >
          {loading ? <p className="px-4 py-3 text-sm text-slate-500">Searching…</p> : null}
          {error ? <p className="px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {!loading && !error && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matches in your programs.</p>
          ) : null}
          {!loading && !error
            ? grouped.map((group) => (
                <div key={group.label} className="px-1 py-1">
                  <p className="px-3 py-1.5 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{group.label}</p>
                  {group.items.map((item) => {
                    const label = item.name ?? item.title ?? "Result";
                    const subtitle = item.programTitle ?? item.subtitle ?? item.email;
                    const flatIndex = hits.findIndex((hit) => hit.href === item.href && (hit.title === label || hit.name === label));
                    const active = flatIndex === activeIndex;
                    return (
                      <Link
                        key={`${group.label}-${item.id}`}
                        href={item.href}
                        role="option"
                        aria-selected={active}
                        className={`block rounded-xl px-3 py-2 text-sm ${active ? "bg-violet-50 text-violet-900" : "text-slate-800 hover:bg-slate-50"}`}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="block font-medium">{label}</span>
                        {subtitle ? <span className="block text-xs text-slate-500">{subtitle}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
