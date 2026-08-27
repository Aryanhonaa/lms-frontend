"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { learnReturnHref } from "@/lib/learning/path";

function LearnReturnLinkInner() {
  const params = useSearchParams();
  if (params.get("from") !== "learn") {
    return null;
  }
  return (
    <p className="px-8 pt-4">
        <Link href={learnReturnHref(params.get("programId"), params.get("batchId"))} className="text-sm font-medium text-violet-700 hover:text-violet-800">
        ← Back to Learn
      </Link>
    </p>
  );
}

export function LearnReturnLink() {
  return (
    <Suspense fallback={null}>
      <LearnReturnLinkInner />
    </Suspense>
  );
}
