import type { AnnouncementItem } from "@/types/engagement";

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function audienceLabel(item: AnnouncementItem): string {
  if (item.audience === "PROGRAM") {
    return item.program?.title ?? "Program";
  }
  if (item.audience === "TRAINEES_SELECTED") {
    const batch = item.batch?.name ?? "Batch";
    const count = item.recipients.length;
    if (count > 0) {
      return `${batch} · ${count} trainee${count === 1 ? "" : "s"}`;
    }
    return batch;
  }
  return item.audience.toLowerCase().replaceAll("_", " ");
}

export function AnnouncementList({
  announcements,
  empty = "No announcements yet.",
}: {
  announcements: AnnouncementItem[];
  empty?: string;
}) {
  if (announcements.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {announcements.map((item) => (
        <li key={item.id} className="px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-900">{item.title}</h3>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{audienceLabel(item)}</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body}</p>
          {item.audience === "TRAINEES_SELECTED" && item.recipients.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">To {item.recipients.map((person) => person.name).join(", ")}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            {item.createdBy.name} · {formatWhen(item.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
