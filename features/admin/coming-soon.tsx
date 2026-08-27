import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </section>
  );
}
