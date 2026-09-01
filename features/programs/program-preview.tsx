import { StatusBadge } from "@/components/status-badge";
import { RejectionBanner } from "@/features/programs/rejection-banner";
import type { ProgramTree, Quiz } from "@/types/program";

function QuizPreview({ quiz }: { quiz: Quiz }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-950/5">
      <p className="font-medium text-slate-900">
        {quiz.title} · {quiz.kind.replaceAll("_", " ").toLowerCase()}
      </p>
      <p className="mt-1 text-slate-500">
        {quiz.questions.length} questions · pass {quiz.passingScore}%
        {quiz.timeLimitMin ? ` · ${quiz.timeLimitMin} min` : ""}
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
        {quiz.questions.map((question) => (
          <li key={question.id}>
            {question.prompt}
            <ul className="list-disc pl-5">
              {question.options.map((option) => (
                <li key={option.id}>{option.label}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProgramPreview({ program }: { program: ProgramTree }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-950/5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{program.title}</h2>
          <StatusBadge status={program.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{program.description || "No description yet."}</p>
        <p className="mt-3 text-sm text-slate-500">
          Trainee view · answer keys are hidden. This is how the path will read after approval.
        </p>
      </section>
      <RejectionBanner program={program} />
      {program.weeks.map((week, weekIndex) => (
        <section key={week.id} className="rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-950/5">
          <h3 className="font-medium text-slate-900">
            Week {weekIndex + 1}: {week.title}
          </h3>
          {week.description ? <p className="mt-1 text-sm text-slate-600">{week.description}</p> : null}
          <div className="mt-4 space-y-4">
            {week.days.map((day, dayIndex) => (
              <div key={day.id}>
                <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Day {dayIndex + 1}: {day.title}
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {day.resources.map((item) => (
                    <li key={item.id}>
                      Resource · {item.title}
                      {day.assignments
                        .filter((assignment) => assignment.linkedItemType === "RESOURCE" && assignment.linkedItemId === item.id)
                        .map((assignment) => (
                          <span key={assignment.id} className="block pl-4 text-slate-500">
                            Assignment · {assignment.title}
                          </span>
                        ))}
                    </li>
                  ))}
                  {day.videos.map((item) => (
                    <li key={item.id}>
                      Video · {item.title}
                      {day.assignments
                        .filter((assignment) => assignment.linkedItemType === "VIDEO" && assignment.linkedItemId === item.id)
                        .map((assignment) => (
                          <span key={assignment.id} className="block pl-4 text-slate-500">
                            Assignment · {assignment.title}
                          </span>
                        ))}
                    </li>
                  ))}
                  {day.lessons.map((item) => (
                    <li key={item.id}>
                      Lesson · {item.title}
                      {day.assignments
                        .filter((assignment) => assignment.linkedItemType === "LESSON" && assignment.linkedItemId === item.id)
                        .map((assignment) => (
                          <span key={assignment.id} className="block pl-4 text-slate-500">
                            Assignment · {assignment.title}
                          </span>
                        ))}
                    </li>
                  ))}
                  {day.reels.map((item) => (
                    <li key={item.id}>
                      Reel · {item.title}
                      {day.assignments
                        .filter((assignment) => assignment.linkedItemType === "REEL" && assignment.linkedItemId === item.id)
                        .map((assignment) => (
                          <span key={assignment.id} className="block pl-4 text-slate-500">
                            Assignment · {assignment.title}
                          </span>
                        ))}
                    </li>
                  ))}
                  {day.assignments
                    .filter((item) => !item.linkedItemId)
                    .map((item) => (
                    <li key={item.id}>Assignment · {item.title}</li>
                  ))}
                </ul>
                <div className="mt-3 space-y-2">
                  {day.quizzes.map((quiz) => (
                    <QuizPreview key={quiz.id} quiz={quiz} />
                  ))}
                </div>
              </div>
            ))}
            {week.quizzes.map((quiz) => (
              <QuizPreview key={quiz.id} quiz={quiz} />
            ))}
            {week.trainingSessions.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {week.trainingSessions.map((session) => (
                  <li key={session.id}>
                    Session · {session.title} · {new Date(session.startsAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
      {program.milestones.map((milestone) => (
        <section key={milestone.id} className="rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-950/5">
          <h3 className="font-medium text-slate-900">Milestone · {milestone.title}</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {milestone.requirements.map((requirement) => (
              <li key={requirement.id}>{requirement.label}</li>
            ))}
          </ul>
          {milestone.exam ? <div className="mt-3"><QuizPreview quiz={milestone.exam} /></div> : null}
        </section>
      ))}
      {program.quizzes.map((quiz) => (
        <QuizPreview key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
