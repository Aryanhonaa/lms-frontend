import {
  BookOpen,
  CircleHelp,
  Clapperboard,
  FileText,
  PenLine,
  PlayCircle,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { contentTypeLabel } from "@/lib/learning/ux";

type Identity = {
  label: string;
  icon: LucideIcon;
  chip: string;
  iconWrap: string;
  accent: string;
};

const IDENTITY: Record<string, Identity> = {
  LESSON: {
    label: "Lesson",
    icon: BookOpen,
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    iconWrap: "bg-indigo-600 text-white",
    accent: "from-indigo-500 to-violet-500",
  },
  VIDEO: {
    label: "Video",
    icon: PlayCircle,
    chip: "bg-violet-50 text-violet-700 ring-violet-100",
    iconWrap: "bg-violet-600 text-white",
    accent: "from-violet-500 to-fuchsia-500",
  },
  REEL: {
    label: "Reel",
    icon: Clapperboard,
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
    iconWrap: "bg-fuchsia-600 text-white",
    accent: "from-fuchsia-500 to-rose-500",
  },
  RESOURCE: {
    label: "Reading",
    icon: FileText,
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    iconWrap: "bg-slate-700 text-white",
    accent: "from-slate-500 to-slate-700",
  },
  QUIZ: {
    label: "Quiz",
    icon: CircleHelp,
    chip: "bg-amber-50 text-amber-800 ring-amber-100",
    iconWrap: "bg-amber-500 text-white",
    accent: "from-amber-400 to-orange-500",
  },
  ASSIGNMENT: {
    label: "Assignment",
    icon: PenLine,
    chip: "bg-sky-50 text-sky-700 ring-sky-100",
    iconWrap: "bg-sky-600 text-white",
    accent: "from-sky-500 to-cyan-500",
  },
  MILESTONE_EXAM: {
    label: "Milestone Exam",
    icon: Target,
    chip: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100",
    iconWrap: "bg-fuchsia-700 text-white",
    accent: "from-fuchsia-500 to-violet-600",
  },
  FINAL_EXAM: {
    label: "Final Exam",
    icon: Trophy,
    chip: "bg-amber-50 text-amber-900 ring-amber-200",
    iconWrap: "bg-amber-600 text-white",
    accent: "from-amber-500 to-orange-600",
  },
};

function identityFor(type: string, kind?: string | null): Identity {
  if (type === "ASSIGNMENT" || kind === "ASSIGNMENT") {
    return IDENTITY.ASSIGNMENT;
  }
  if (kind === "FINAL_EXAM") {
    return IDENTITY.FINAL_EXAM;
  }
  if (kind === "MILESTONE_EXAM") {
    return IDENTITY.MILESTONE_EXAM;
  }
  if (IDENTITY[type]) {
    return IDENTITY[type];
  }
  if (kind?.includes("QUIZ") || kind?.includes("EXAM") || type === "QUIZ") {
    return IDENTITY.QUIZ;
  }
  return IDENTITY.LESSON;
}

export function ContentTypeChip({
  type,
  kind,
  className = "",
}: {
  type: string;
  kind?: string | null;
  className?: string;
}) {
  const identity = identityFor(type, kind);
  const Icon = identity.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${identity.chip} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {contentTypeLabel(type, kind)}
    </span>
  );
}

export function ContentTypeIcon({
  type,
  kind,
  size = "md",
}: {
  type: string;
  kind?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const identity = identityFor(type, kind);
  const Icon = identity.icon;
  const box = size === "lg" ? "h-12 w-12 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-xl";
  const icon = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br ${identity.accent} ${box} text-white shadow-sm`}>
      <Icon className={icon} strokeWidth={2} />
    </span>
  );
}
