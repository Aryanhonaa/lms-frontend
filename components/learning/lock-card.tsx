import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { ContentTypeChip } from "@/components/learning/content-type-chip";
import { traineeCardClass, traineePrimaryCtaClass } from "@/lib/ui/trainee";
import { friendlyLockReason } from "@/lib/learning/ux";

export function LockCard({
  reason,
  doFirst,
  doFirstHref,
  unlocksTitle,
  exhaustedAttempts = false,
}: {
  reason: string | null;
  doFirst?: { title: string; type: string; kind?: string } | null;
  doFirstHref?: string;
  unlocksTitle?: string | null;
  exhaustedAttempts?: boolean;
}) {
  if (exhaustedAttempts) {
    return (
      <div className={`${traineeCardClass} overflow-hidden`}>
        <div className="flex items-start gap-4 bg-gradient-to-br from-emerald-50 via-white to-slate-50 px-5 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Available</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              You did not pass the previous quiz, but you have used all available attempts. You can continue with the
              course.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${traineeCardClass} overflow-hidden`}>
      <div className="flex items-start gap-4 bg-gradient-to-br from-slate-50 via-white to-violet-50/40 px-5 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">This is locked for now</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{friendlyLockReason(reason)}</p>
          {unlocksTitle ? (
            <p className="mt-3 text-sm text-slate-500">
              Finish the current step and you&apos;ll unlock <span className="font-medium text-slate-800">{unlocksTitle}</span>.
            </p>
          ) : null}
          {doFirst && doFirstHref ? (
            <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-slate-950/5">
              <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">Do this first</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ContentTypeChip type={doFirst.type} kind={doFirst.kind} />
                <p className="text-sm font-medium text-slate-900">{doFirst.title}</p>
              </div>
              <Link href={doFirstHref} className={`${traineePrimaryCtaClass} mt-3`}>
                Continue Learning
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function UnlocksNextCard({
  href,
  type,
  kind,
  title,
}: {
  href: string;
  type: string;
  kind?: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className={`${traineeCardClass} group flex items-center gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-violet-200`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">You&apos;ll unlock next</p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-900">{title}</p>
      </div>
      <ContentTypeChip type={type} kind={kind} />
    </Link>
  );
}
