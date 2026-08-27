"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Megaphone } from "lucide-react";
import { getNotificationInbox, markNotificationsRead } from "@/lib/api/engagement";
import { ApiClientError } from "@/lib/api/client";
import type { NotificationItem } from "@/types/engagement";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function NotificationBell({ role, allHref }: { role: "trainee" | "trainer"; allHref: string }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationInbox(role)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setItems(payload.notifications);
        setUnreadCount(payload.unreadCount);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setItems([]);
        setUnreadCount(0);
        setError(err instanceof ApiClientError ? err.message : "Unable to load notifications");
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

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
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || unreadCount === 0) {
      return;
    }
    void markNotificationsRead(role)
      .then((payload) => {
        setItems(payload.notifications);
        setUnreadCount(payload.unreadCount);
      })
      .catch(() => undefined);
  }

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative rounded-full p-2 text-slate-600 transition duration-200 hover:bg-slate-50"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-950/5">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">Notifications</p>
            <Link href={allHref} className="text-xs font-medium text-violet-700 hover:text-violet-800" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          {error ? <p className="px-4 py-6 text-sm text-red-700">{error}</p> : null}
          {!error && items === null ? <p className="px-4 py-6 text-sm text-slate-500">Loading…</p> : null}
          {!error && items && items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">You&apos;re all caught up. New announcements will show up here.</p>
          ) : null}
          {!error && items && items.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`flex items-start gap-3 px-4 py-3 transition duration-150 hover:bg-slate-50 ${item.read ? "" : "bg-violet-50/70"}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <Megaphone className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{item.body}</span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {item.programTitle ? `${item.programTitle} · ` : ""}
                        {formatWhen(item.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
