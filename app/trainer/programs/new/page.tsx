"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { TrainerShell } from "@/components/trainer-shell";
import { ErrorState } from "@/components/ui/empty-state";
import { createProgram } from "@/lib/api/programs";
import { ApiClientError } from "@/lib/api/client";
import { CARD, fieldClass, primaryButtonClass } from "@/features/programs/builder/ui";
import { useAuth } from "@/providers/auth-provider";

export default function NewProgramPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <TrainerShell title="Create program" user={user}>
      <section className="mx-auto max-w-lg">
        <div className={`${CARD} p-6`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <GraduationCap className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Name your program</h2>
          <p className="mt-1 text-sm text-slate-500">
            You&apos;ll add the description, schedule, weeks, and lessons in the builder. This just creates a draft you can return to.
          </p>
          <form
            className="mt-6 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const next = title.trim();
              if (!next) {
                setError("Give the program a name");
                return;
              }
              setBusy(true);
              setError(null);
              void createProgram({ title: next })
                .then((payload) => {
                  router.replace(`/trainer/programs/${payload.program.id}/builder`);
                })
                .catch((err: unknown) => {
                  setError(err instanceof ApiClientError ? err.message : "Unable to create program");
                  setBusy(false);
                });
            }}
          >
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-800">Program title</span>
              <input
                className={fieldClass}
                value={title}
                autoFocus
                placeholder="Cybersecurity Fundamentals"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            {error ? <ErrorState message={error} /> : null}
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              {busy ? "Creating…" : "Start building"}
            </button>
          </form>
        </div>
      </section>
    </TrainerShell>
  );
}
