import type { LeaderboardBoard, PublicLeaderboardEntry } from "@/types/engagement";

function metric(label: string, value: string) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-950">{value}</p>
    </div>
  );
}

function passedLabel(passed: number, total: number): string {
  if (total === 0) {
    return "None in this program";
  }
  return `${passed} / ${total}`;
}

function Row({
  entry,
  highlight,
}: {
  entry: PublicLeaderboardEntry;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-amber-50" : undefined}>
      <td className="px-5 py-3 text-sm font-semibold text-stone-950">{entry.rank}</td>
      <td className="px-3 py-3 text-sm text-stone-900">
        {entry.trainee.name}
        {highlight ? <span className="ml-2 text-xs uppercase tracking-wide text-amber-800">You</span> : null}
      </td>
      <td className="px-3 py-3 text-sm text-stone-800">{entry.score}</td>
      <td className="px-3 py-3 text-sm text-stone-600">{entry.progressPercent}%</td>
      <td className="px-3 py-3 text-sm text-stone-600">{passedLabel(entry.quizzesPassed, entry.quizzesTotal)}</td>
      <td className="px-3 py-3 text-sm text-stone-600">{passedLabel(entry.examsPassed, entry.examsTotal)}</td>
      <td className="px-5 py-3 text-sm text-stone-600">
        {passedLabel(entry.milestonesComplete, entry.milestonesTotal)}
      </td>
    </tr>
  );
}

export function LeaderboardBoardView({
  board,
  viewerId,
  tone = "stone",
  subtitle,
}: {
  board: LeaderboardBoard;
  viewerId?: string;
  tone?: "stone" | "admin";
  subtitle?: string;
}) {
  const card = tone === "admin"
    ? "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/5"
    : "bg-white";
  const head = tone === "admin" ? "text-slate-500" : "text-stone-500";
  const you = board.you;

  return (
    <section className={card}>
      <div className="border-b border-stone-200 px-5 py-4">
        <h2 className="text-base font-medium text-stone-950">{board.program.title}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {subtitle ??
            "Rank uses a blended score of progress, quiz performance, exam performance, and milestones — not completion percent alone."}
        </p>
      </div>
      {you ? (
        <div className="grid gap-4 border-b border-stone-100 px-5 py-4 sm:grid-cols-4">
          {metric("Your rank", `#${you.rank}`)}
          {metric("Your score", String(you.score))}
          {metric("Progress", `${you.breakdown.progress}%`)}
          {metric(
            "Your mix",
            [
              you.breakdown.quiz === null ? null : `Quiz ${you.breakdown.quiz}`,
              you.breakdown.exam === null ? null : `Exam ${you.breakdown.exam}`,
              you.breakdown.milestone === null ? null : `Milestones ${you.breakdown.milestone}`,
            ]
              .filter(Boolean)
              .join(" · ") || "Progress only",
          )}
        </div>
      ) : null}
      {board.entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-stone-500">No trainees on this board yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className={`text-xs uppercase tracking-wide ${head}`}>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-3 py-3 font-medium">Trainee</th>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium">Progress</th>
                <th className="px-3 py-3 font-medium">Quizzes passed</th>
                <th className="px-3 py-3 font-medium">Exams passed</th>
                <th className="px-5 py-3 font-medium">Milestones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {board.entries.map((entry) => (
                <Row key={entry.trainee.id} entry={entry} highlight={viewerId === entry.trainee.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
