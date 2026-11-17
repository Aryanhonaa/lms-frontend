export type SaveState = "saved" | "saving" | "unsaved" | "idle";

export function SaveStatus({ state }: { state: SaveState }) {
  const label = state === "saving" ? "Saving" : state === "unsaved" ? "Unsaved" : state === "saved" ? "Saved" : "";
  if (!label) {
    return null;
  }
  const dot = state === "saved" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${state === "saving" ? "animate-pulse" : ""}`} />
      {label}
    </p>
  );
}
