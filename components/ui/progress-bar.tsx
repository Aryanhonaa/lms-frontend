export function ProgressBar({
  value,
  label,
  tone = "teal",
  size = "sm",
}: {
  value: number;
  label?: string;
  tone?: "teal" | "violet";
  size?: "sm" | "md";
}) {
  const width = Math.min(100, Math.max(0, value));
  const track = size === "md" ? "h-2.5" : "h-1.5";
  const fill =
    tone === "violet"
      ? "bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-500"
      : "bg-gradient-to-r from-teal-600 to-emerald-500";
  return (
    <div>
      {label ? <p className="mb-1 text-xs text-slate-500">{label}</p> : null}
      <div
        className={`${track} overflow-hidden rounded-full bg-slate-200/90`}
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`lms-progress-fill h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
