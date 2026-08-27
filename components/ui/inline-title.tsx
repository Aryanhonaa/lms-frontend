"use client";

import { useState } from "react";
import { fieldClass } from "@/lib/ui/form-classes";

export function InlineTitle({
  value,
  disabled,
  onSave,
  as = "h2",
}: {
  value: string;
  disabled?: boolean;
  onSave: (next: string) => Promise<void> | void;
  as?: "h2" | "h3" | "p";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const Tag = as;

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    await onSave(next);
  }

  if (disabled || !editing) {
    return (
      <button
        type="button"
        className="text-left"
        disabled={disabled}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <Tag className="text-base font-medium text-slate-900">{value}</Tag>
      </button>
    );
  }

  return (
    <input
      aria-label="Rename"
      className={`${fieldClass} max-w-md`}
      value={draft}
      autoFocus
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void commit();
        }
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}
