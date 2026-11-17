"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export type MenuAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionMenu({ items, label = "More actions" }: { items: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((item) => item.label);

  useEffect(() => {
    if (!open) {
      return;
    }
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) {
      return;
    }

    function place() {
      if (!button || !menu) {
        return;
      }
      const rect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 4;
      const openUp = rect.bottom + gap + menuRect.height > window.innerHeight - 8 && rect.top > menuRect.height + gap + 8;
      const top = openUp ? rect.top - menuRect.height - gap : rect.bottom + gap;
      const left = Math.min(Math.max(8, rect.right - menuRect.width), window.innerWidth - menuRect.width - 8);
      menu.style.top = `${Math.max(8, top)}px`;
      menu.style.left = `${left}px`;
      menu.style.visibility = "visible";
    }

    place();

    function close() {
      setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!menu?.contains(target) && !button?.contains(target)) {
        close();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        button?.focus();
      }
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition duration-150 hover:bg-slate-100 hover:text-slate-800"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: "fixed", top: 0, left: 0, visibility: "hidden" }}
              className="z-[100] min-w-40 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5"
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
