import type { Day, ProgramTree, Quiz, Week } from "@/types/program";

export type BuilderSection = "overview" | "curriculum" | "content" | "assessments" | "review";

export type SectionStatus = "complete" | "attention" | "optional" | "incomplete";

export const BUILDER_SECTIONS: Array<{ id: BuilderSection; label: string; hint: string }> = [
  { id: "overview", label: "Overview", hint: "What is this program?" },
  { id: "curriculum", label: "Curriculum", hint: "Weeks and days" },
  { id: "content", label: "Content", hint: "Lessons and materials" },
  { id: "assessments", label: "Assessments", hint: "Quizzes, exams, assignments" },
  { id: "review", label: "Review", hint: "Check and send" },
];

export const NEXT_SECTION: Record<BuilderSection, BuilderSection | null> = {
  overview: "curriculum",
  curriculum: "content",
  content: "assessments",
  assessments: "review",
  review: null,
};

export function isExamKind(kind: Quiz["kind"]): boolean {
  return kind === "WEEKLY_EXAM" || kind === "MILESTONE_EXAM" || kind === "FINAL_EXAM";
}

export function dayLearningCount(day: Day): number {
  return day.lessons.length + day.videos.length + day.resources.length + day.reels.length;
}

export function dayItemCount(day: Day): number {
  return dayLearningCount(day) + day.assignments.length + day.quizzes.length;
}

export function weekHasContent(week: Week): boolean {
  return week.days.some((day) => dayItemCount(day) > 0) || week.quizzes.length > 0;
}

export function collectAssignments(program: ProgramTree) {
  return program.weeks.flatMap((week) =>
    week.days.flatMap((day) =>
      day.assignments.map((item) => ({
        ...item,
        weekTitle: week.title,
        dayTitle: day.title,
        dayId: day.id,
      })),
    ),
  );
}

export function collectQuizzes(program: ProgramTree): Array<Quiz & { scope: string }> {
  return [
    ...program.weeks.flatMap((week) =>
      week.days.flatMap((day) =>
        day.quizzes.map((quiz) => ({ ...quiz, scope: `${week.title} · ${day.title}` })),
      ),
    ),
    ...program.weeks.flatMap((week) => week.quizzes.map((quiz) => ({ ...quiz, scope: week.title }))),
    ...program.milestones.flatMap((milestone) =>
      milestone.exam ? [{ ...milestone.exam, scope: milestone.title }] : [],
    ),
    ...program.quizzes.map((quiz) => ({ ...quiz, scope: "Program" })),
  ];
}

export function analyzeBuilder(program: ProgramTree) {
  const weekCount = program.weeks.length;
  const dayCount = program.weeks.reduce((sum, week) => sum + week.days.length, 0);
  const learningCount = program.weeks.reduce(
    (sum, week) => sum + week.days.reduce((inner, day) => inner + dayLearningCount(day), 0),
    0,
  );
  const assignments = collectAssignments(program);
  const quizzes = collectQuizzes(program);
  const exams = quizzes.filter((item) => isExamKind(item.kind));
  const hasTitle = program.title.trim().length > 0;
  const hasDescription = program.description.trim().length > 0;
  const canSubmit = weekCount >= 1;

  const overview: SectionStatus = !hasTitle ? "incomplete" : hasDescription ? "complete" : "attention";
  const curriculum: SectionStatus = weekCount === 0 ? "incomplete" : dayCount === 0 ? "attention" : "complete";
  const content: SectionStatus = learningCount > 0 ? "complete" : dayCount > 0 ? "attention" : "incomplete";
  const assessments: SectionStatus = assignments.length + quizzes.length > 0 ? "complete" : "optional";
  const review: SectionStatus = canSubmit ? "complete" : "incomplete";

  const requiredDone = [hasTitle, weekCount >= 1, learningCount > 0, canSubmit].filter(Boolean).length;

  return {
    weekCount,
    dayCount,
    learningCount,
    assignmentCount: assignments.length,
    quizCount: quizzes.length,
    examCount: exams.length,
    milestoneCount: program.milestones.length,
    canSubmit,
    submitHint: canSubmit ? null : "Add at least one week before sending for review.",
    overview,
    curriculum,
    content,
    assessments,
    review,
    percent: Math.round((requiredDone / 4) * 100),
    completedLabel: `${requiredDone} of 4 setup checks complete`,
    statuses: {
      overview,
      curriculum,
      content,
      assessments,
      review,
    } as Record<BuilderSection, SectionStatus>,
  };
}

export function firstDayId(program: ProgramTree): string | null {
  return program.weeks[0]?.days[0]?.id ?? null;
}

export function findDay(program: ProgramTree, dayId: string): { week: Week; day: Day; weekIndex: number; dayIndex: number } | null {
  for (const [weekIndex, week] of program.weeks.entries()) {
    const dayIndex = week.days.findIndex((day) => day.id === dayId);
    const day = week.days[dayIndex];
    if (dayIndex >= 0 && day) {
      return { week, day, weekIndex, dayIndex };
    }
  }
  return null;
}
