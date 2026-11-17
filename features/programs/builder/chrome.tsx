"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export type MenuAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({ items, label = "More actions" }: { items: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const visible = items.filter((item) => item.label);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition duration-150 hover:bg-slate-100 hover:text-slate-800"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-40 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition duration-150 disabled:opacity-40 ${
                item.danger ? "text-red-700 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
