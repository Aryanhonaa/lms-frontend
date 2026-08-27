export type SaveState = "saved" | "saving" | "unsaved" | "idle";

export function SaveStatus({ state }: { state: SaveState }) {
  const label =
    state === "saving" ? "Saving…" : state === "unsaved" ? "Unsaved changes" : state === "saved" ? "Saved just now" : "";
  if (!label) {
    return null;
  }
  return <p className="text-xs text-slate-500">{label}</p>;
}
