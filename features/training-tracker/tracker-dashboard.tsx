"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/empty-state";
import { useTrackerCapabilities } from "@/features/training-tracker/tracker-capabilities";
import { KpiCard, SectionTitle, TrackerSubnav, countPercentLabel, formatDay, trackerBase } from "@/features/training-tracker/tracker-ui";
import { getTrackerDashboard, percentLabel, processLabel } from "@/lib/api/training-tracker";
import { ApiClientError } from "@/lib/api/client";
import { cardClass, primaryButtonClass } from "@/lib/ui/form-classes";
import type { TrackerDashboard } from "@/types/training-tracker";

export function TrackerDashboardView() {
  const pathname = usePathname();
  const base = trackerBase(pathname);
  const { canOperate } = useTrackerCapabilities();
  const [data, setData] = useState<TrackerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrackerDashboard()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiClientError ? err.message : "Unable to load batches"));
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }
  if (!data) {
    return <LoadingState label="Loading batches…" />;
  }

  const k = data.kpis;
  const o = data.outcomes;
  const maxThroughput = Math.max(1, ...data.throughput.map((row) => row.throughputPercent ?? 0));
  const attritionTotal = Math.max(1, data.attrition.hr + data.attrition.training);
  const certMax = Math.max(1, data.certification.appeared, data.certification.certified, data.certification.handedOver);

  return (
    <div className="space-y-6">
      <TrackerSubnav />
      <div className={`${cardClass} px-5 py-4`}>
        <p className="text-sm font-semibold text-slate-900">{canOperate ? "How your batches work" : "How batches work"}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {canOperate
            ? "Create a batch, link courses, add people, then record weekly scores and exam/handover. Open a batch to see trainee-level status, course %, and outcomes."
            : "Trainers run day-to-day tracking. Use this view for org-wide batch health, then drill into a batch for trainee details."}
        </p>
        <Link href={`${base}/batches`} className={`${primaryButtonClass} mt-4`}>
          {canOperate ? "Open my batches" : "View all batches"}
        </Link>
      </div>

      <div>
        <SectionTitle
          title="Overall summary"
          hint={`Percentages use total enrolled trainees (${o?.totalEnrolled ?? k.totalTrainees}). Client Day 7 / exam metrics stay below.`}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total batches" value={k.totalBatches ?? k.activeBatches + k.completedBatches} />
          <KpiCard label="Total trainees" value={o?.totalEnrolled ?? k.totalTrainees} />
          <KpiCard label="Active trainees" value={countPercentLabel(o?.active)} />
          <KpiCard label="Mid-batch dropouts" value={countPercentLabel(o?.leftMidBatch)} />
          <KpiCard label="Terminated" value={countPercentLabel(o?.terminated)} />
          <KpiCard label="Completed & certified" value={countPercentLabel(o?.completedCertified)} />
          <KpiCard label="Completed – not certified" value={countPercentLabel(o?.completedNotCertified)} />
          <KpiCard label="Joined mid-batch" value={countPercentLabel(o?.joinedMidBatch)} hint="Joined after Day 1" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Batches in training" value={k.activeBatches} hint="Currently running" />
        <KpiCard label="People in training" value={k.currentTrainees} hint={`${k.totalTrainees} total recorded`} />
        <KpiCard label="Certified (of exam)" value={k.certified} hint={percentLabel(k.certificationPercent)} />
        <KpiCard label="Need extra support" value={k.tniCount} hint="Average audit below 75%" />
      </div>
      <section className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-slate-100 px-5 py-3">
          <SectionTitle title="Batches in training now" hint="Training is 25 working days (weekends don’t count)." />
        </div>
        {data.batchProgress.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            {canOperate ? "No batches are in training. Create one from My batches." : "No batches are in training yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.batchProgress.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`${base}/batches/${row.id}`} className="font-medium text-slate-900 hover:text-violet-700">
                    {row.code}
                  </Link>
                  <span className="text-xs font-medium text-slate-600">{row.trainingDayLabel}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${row.progressPercent}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {processLabel(row.process)} ·{" "}
                  {(row.courses?.length ? row.courses : row.course ? [row.course] : []).map((c) => c.title).join(", ") ||
                    "No course"}{" "}
                  · Trainer {row.salesTrainer.name} · started {formatDay(row.trainingStartDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${cardClass} px-5 py-4`}>
          <SectionTitle title="Exam to floor" hint="Who sat the exam, passed, and joined operations." />
          {[
            ["Sat the exam", data.certification.appeared],
            ["Certified", data.certification.certified],
            ["Handed over", data.certification.handedOver],
          ].map(([label, value]) => (
            <div key={String(label)} className="mt-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(Number(value) / certMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
        <section className={`${cardClass} px-5 py-4`}>
          <SectionTitle title="People who left" hint="First 3 days vs later in training." />
          <p className="mt-3 text-sm text-slate-600">Left in first 3 days: {data.attrition.hr}</p>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(data.attrition.hr / attritionTotal) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">Did not pass training: {data.attrition.training}</p>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${(data.attrition.training / attritionTotal) * 100}%` }} />
          </div>
        </section>
        <section className={`${cardClass} px-5 py-4`}>
          <SectionTitle title="Extra support" hint="Opened when weekly quality score averages under 75%." />
          <p className="mt-3 text-sm text-slate-600">In support now: {data.tni.open}</p>
          <p className="mt-1 text-sm text-slate-600">Cleared: {data.tni.cleared}</p>
          <p className="mt-1 text-sm text-slate-600">Needs a supervisor look: {data.tni.review}</p>
          <Link href={`${base}/tni`} className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">
            Open extra support
          </Link>
        </section>
      </div>
      <section className={`${cardClass} px-5 py-4`}>
        <SectionTitle title="How many certified vs Day 7 headcount" hint="Throughput = certified ÷ people still in batch after 7 days." />
        {data.throughput.length === 0 ? (
          <EmptyState title="No results yet" description="Throughput shows after you record exam results." />
        ) : (
          <ul className="mt-3 space-y-2">
            {data.throughput.map((row) => (
              <li key={row.id}>
                <div className="flex justify-between text-xs text-slate-500">
                  <Link href={`${base}/batches/${row.id}`} className="font-medium text-slate-700 hover:text-violet-700">
                    {row.code}
                  </Link>
                  <span>{percentLabel(row.throughputPercent)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${((row.throughputPercent ?? 0) / maxThroughput) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
