import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LearnView } from "../../types/learning";
import {
  assessmentHierarchy,
  contentTypeLabel,
  flattenLearnPath,
  lockCopyForItem,
  pathItemStatusCopy,
} from "./ux";

function view(partial: Partial<LearnView>["weeks"] extends infer _ ? Partial<LearnView> : never): LearnView {
  return {
    enrollment: {
      id: "e1",
      status: "ACTIVE",
      overallProgress: 0,
      currentWeekIndex: 1,
      currentDayIndex: 1,
    },
    program: {
      id: "p1",
      title: "Course",
      description: "",
      category: "Web",
      difficulty: "BEGINNER",
      durationWeeks: 2,
      trainingMode: "PROGRESSION",
      status: "PUBLISHED",
    },
    currentWeek: null,
    currentDay: null,
    nextActivity: null,
    course: { outcome: "PENDING", courseStatus: "IN_PROGRESS", failedAssessments: [] },
    progress: { completedRequired: 0, totalRequired: 1, percent: 0 },
    weeks: [],
    ...partial,
  };
}

describe("learning sidebar path", () => {
  it("keeps a normal day quiz inside its week and day, not as a final exam", () => {
    const path = flattenLearnPath(
      view({
        weeks: [
          {
            id: "w2",
            sortOrder: 2,
            title: "Week 2",
            status: "AVAILABLE",
            reason: null,
            days: [
              {
                id: "d1",
                sortOrder: 1,
                title: "Day 1",
                status: "AVAILABLE",
                reason: null,
                items: [],
                quizzes: [
                  {
                    id: "q1",
                    title: "Week 2 quiz",
                    kind: "PRACTICE_QUIZ",
                    status: "AVAILABLE",
                    reason: null,
                    canRetry: false,
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    assert.equal(path.length, 1);
    assert.equal(path[0].weekTitle, "Week 2");
    assert.equal(path[0].dayTitle, "Day 1");
    assert.equal(path[0].kind, "PRACTICE_QUIZ");
    assert.equal(assessmentHierarchy(path[0].kind), "quiz");
    assert.equal(contentTypeLabel("QUIZ", path[0].kind), "Quiz");
  });

  it("does not duplicate a final exam that is also listed on a day", () => {
    const exam = {
      id: "final",
      title: "Capstone",
      kind: "FINAL_EXAM",
      status: "AVAILABLE" as const,
      reason: null,
      canRetry: false,
    };
    const path = flattenLearnPath(
      view({
        weeks: [
          {
            id: "w4",
            sortOrder: 4,
            title: "Week 4",
            status: "AVAILABLE",
            reason: null,
            days: [
              {
                id: "d1",
                sortOrder: 1,
                title: "Day 1",
                status: "AVAILABLE",
                reason: null,
                items: [],
                quizzes: [exam],
              },
            ],
          },
        ],
        finalExam: exam,
      }),
    );
    const finals = path.filter((item) => item.kind === "FINAL_EXAM");
    assert.equal(finals.length, 1);
    assert.equal(contentTypeLabel("QUIZ", "FINAL_EXAM"), "Final Exam");
    assert.equal(contentTypeLabel("QUIZ", "MILESTONE_EXAM"), "Milestone Exam");
  });

  it("shows retry vs exhausted status without calling a failed quiz passed", () => {
    assert.equal(
      pathItemStatusCopy({ type: "QUIZ", kind: "PRACTICE_QUIZ", status: "FAILED", canRetry: true }).label.includes("Retry"),
      true,
    );
    assert.equal(
      pathItemStatusCopy({ type: "QUIZ", kind: "PRACTICE_QUIZ", status: "FAILED", canRetry: false }).label.includes("Retry"),
      false,
    );
    assert.equal(
      pathItemStatusCopy({ type: "QUIZ", kind: "PRACTICE_QUIZ", status: "FAILED", canRetry: false }).label.includes("Attempts exhausted"),
      true,
    );
    assert.equal(pathItemStatusCopy({ type: "QUIZ", kind: "FINAL_EXAM", status: "PASSED" }).label, "Passed");
  });

  it("does not tell the trainee to pass a quiz after attempts are exhausted", () => {
    const copy = lockCopyForItem(
      {
        type: "ASSIGNMENT",
        id: "a1",
        title: "Assignment",
        status: "LOCKED",
        reason: "Pass this day's quiz before the assignment.",
        weekTitle: "Week 4",
        dayTitle: "Day 1",
      },
      [
        {
          type: "QUIZ",
          kind: "PRACTICE_QUIZ",
          id: "q1",
          title: "Quiz",
          status: "FAILED",
          reason: null,
          weekTitle: "Week 4",
          dayTitle: "Day 1",
          canRetry: false,
        },
      ],
    );
    assert.match(copy, /used all available attempts/i);
    assert.doesNotMatch(copy, /pass today'?s quiz/i);
  });
});
