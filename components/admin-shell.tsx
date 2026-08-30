"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeft,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar } from "@/components/user-avatar";
import { listAdminPrograms } from "@/lib/api/programs";
import { useAuth } from "@/providers/auth-provider";
import type { ProgramSummary } from "@/types/program";

type AdminChromeValue = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
};

const AdminChromeContext = createContext<AdminChromeValue>({
  searchQuery: "",
  setSearchQuery: () => undefined,
});

export function useAdminChrome(): AdminChromeValue {
  return useContext(AdminChromeContext);
}

type NavChild = { href: string; label: string };
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  children?: readonly NavChild[];
};

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/usage", label: "App Usage", icon: Clock3 },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    children: [
      { href: "/admin/users", label: "All users" },
      { href: "/admin/users?role=ADMIN", label: "Admins" },
      { href: "/admin/users?role=TRAINER", label: "Trainers" },
      { href: "/admin/users?role=TRAINEE", label: "Trainees" },
    ],
  },
  { href: "/admin/approvals", label: "Material Approvals", icon: ClipboardCheck },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: GraduationCap },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Programs", icon: BookOpen },
  { href: "/admin/usage", label: "App Usage", icon: Clock3 },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/trainers", label: "Trainers", icon: GraduationCap },
  { href: "/admin/trainees", label: "Trainees", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const SUPER_ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/leaderboard",
  "/admin/announcements",
  "/admin/feedback",
  "/admin/certificates",
];

function isActivePath(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActiveChild(href: string, pathname: string, role: string | null): boolean {
  const queryIndex = href.indexOf("?");
  const path = queryIndex === -1 ? href : href.slice(0, queryIndex);
  if (path !== pathname) {
    return false;
  }
  const expectedRole = queryIndex === -1 ? null : new URLSearchParams(href.slice(queryIndex)).get("role");
  return expectedRole === role;
}

function isDesktop(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function AdminShell({
  children,
}: {
  children: ReactNode;
  title?: string;
  user?: unknown;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const roleFilter = searchParams.get("role");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [usersOpen, setUsersOpen] = useState(pathname.startsWith("/admin/users"));
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [submitted, setSubmitted] = useState<ProgramSummary[]>([]);
  const navItems = user?.role === "ADMIN" ? ADMIN_NAV : SUPER_ADMIN_NAV;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(sessionStorage.getItem("lms-admin-sidebar") === "1");
      setSidebarReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!sidebarReady) {
      return;
    }
    sessionStorage.setItem("lms-admin-sidebar", collapsed ? "1" : "0");
  }, [collapsed, sidebarReady]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSidebarOpen(false);
      setProfileOpen(false);
      setNotificationsOpen(false);
      setUsersOpen(pathname.startsWith("/admin/users"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      return;
    }
    if (SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      router.replace("/admin");
    }
  }, [pathname, router, user?.role]);

  useEffect(() => {
    let cancelled = false;
    listAdminPrograms("SUBMITTED")
      .then((payload) => {
        if (!cancelled) {
          setSubmitted(payload.programs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmitted([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const chromeValue = useMemo(() => ({ searchQuery, setSearchQuery }), [searchQuery]);

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
    <AdminChromeContext.Provider value={chromeValue}>
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-600/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className={collapsed ? "lg:hidden" : ""}>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Learn Lab</p>
              <p className="text-xs text-slate-500">{user.role === "ADMIN" ? "Admin" : "Super Admin"}</p>
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

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Admin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href, "exact" in item && item.exact);
              const children = item.children;
              const hasChildren = Boolean(children && children.length > 0);

              if (hasChildren && children) {
                if (collapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition lg:justify-center lg:px-0 ${
                        active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      <span className="lg:hidden">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                      onClick={() => setUsersOpen((open) => !open)}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition ${usersOpen ? "rotate-180" : ""}`} />
                    </button>
                    {usersOpen ? (
                      <div className="mt-1 ml-4 space-y-1 border-l border-slate-200 pl-3">
                        {children.map((child) => {
                          const childActive = isActiveChild(child.href, pathname, roleFilter);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`block rounded-lg px-2.5 py-1.5 text-sm ${
                                childActive
                                  ? "bg-white font-medium text-violet-700"
                                  : "text-slate-500 hover:bg-white hover:text-slate-900"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-white hover:text-slate-900"
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
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-50"
              onClick={onMenuClick}
              aria-label={sidebarOpen || !collapsed ? "Toggle sidebar" : "Open menu"}
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            <form
              className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-inner"
              onSubmit={(event) => {
                event.preventDefault();
                if (pathname !== "/admin") {
                  router.push("/admin");
                }
              }}
            >
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search courses, people, or activity"
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </form>

            <div className="relative">
              <button
                type="button"
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                <Bell className="h-5 w-5" />
                {submitted.length > 0 ? (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-950/5">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">{submitted.length} programs waiting for review</p>
                  </div>
                  {submitted.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-500">You are all caught up.</p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
                      {submitted.slice(0, 5).map((program) => (
                        <li key={program.id}>
                          <Link
                            href="/admin/approvals"
                            className="block px-4 py-3 text-sm hover:bg-slate-50"
                            onClick={() => setNotificationsOpen(false)}
                          >
                            <p className="font-medium text-slate-900">{program.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">Submitted by {program.createdBy.name}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-slate-50"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>
              {profileOpen ? (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-950/5">
                  <p className="px-2 text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="px-2 text-xs text-slate-500">{user.email}</p>
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
                    {user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? (
                      <Link
                        href="/admin/settings"
                        className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition duration-150 hover:bg-slate-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                    ) : null}
                    <SignOutButton className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                      Sign out
                    </SignOutButton>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </AdminChromeContext.Provider>
  );
}
