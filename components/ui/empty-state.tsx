import Link from "next/link";
import { primaryButtonClass } from "@/lib/ui/form-classes";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={`${primaryButtonClass} mt-5`}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p className="px-1 py-6 text-sm text-stone-500">{label}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-950 underline decoration-red-300 underline-offset-2 hover:decoration-red-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
