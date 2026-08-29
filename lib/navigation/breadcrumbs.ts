export type BreadcrumbCrumb = {
  href: string;
  label: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_HOME = {
  trainer: "/trainer",
  trainee: "/trainee",
  admin: "/admin",
} as const;

type RoleHome = keyof typeof ROLE_HOME;

function isRoleHome(value: string): value is RoleHome {
  return value in ROLE_HOME;
}

function isUuid(value: string): boolean {
  return UUID.test(value);
}

function labelForSegment(
  segment: string,
  previous: string[],
  role: RoleHome,
  entityLabel?: string,
): string {
  const parent = previous[previous.length - 1] ?? "";
  const grandparent = previous[previous.length - 2] ?? "";

  if (isUuid(segment)) {
    if (parent === "programs" || parent === "courses") {
      return entityLabel ?? "Course";
    }
    if (parent === "assessments") {
      return entityLabel ?? (role === "trainee" ? "Quiz" : "Assessment");
    }
    if (parent === "assignments") {
      return entityLabel ?? "Assignment";
    }
    if (parent === "trainees") {
      return entityLabel ?? "Trainee";
    }
    if (parent === "users") {
      return entityLabel ?? "User";
    }
    return entityLabel ?? "Details";
  }

  if (segment === "trainees" && isUuid(parent) && grandparent === "programs") {
    return "Batches";
  }

  if (segment === "courses") {
    return role === "trainee" ? "My Courses" : "Courses";
  }

  const labels: Record<string, string> = {
    programs: "Programs",
    courses: "Courses",
    new: parent === "programs" ? "New course" : "New",
    builder: "Builder",
    trainees: "Trainees",
    trainers: "Trainers",
    users: "Users",
    assessments: "Quizzes",
    assignments: "Assignments",
    calendar: "Calendar",
    interventions: "Needs help",
    leaderboard: "Leaderboard",
    announcements: "Announcements",
    certificates: "Certificates",
    feedback: "Feedback",
    profile: "Profile",
    usage: "App Usage",
    learn: "Learn",
    progress: "Your Journey",
    attendance: "Attendance",
    requirements: "Requirements",
    achievements: "Achievements",
    approvals: "Approvals",
    settings: "Settings",
    program: "Course",
  };

  return labels[segment] ?? segment.replaceAll("-", " ");
}

export function breadcrumbsForPath(pathname: string, entityLabel?: string): BreadcrumbCrumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const role = parts[0];
  if (!role || !isRoleHome(role)) {
    return [];
  }

  const home = ROLE_HOME[role];
  if (parts.length === 1) {
    return [];
  }

  const crumbs: BreadcrumbCrumb[] = [{ href: home, label: role === "trainee" ? "Home" : "Dashboard" }];
  let href = `/${role}`;
  const previous: string[] = [role];

  for (const segment of parts.slice(1)) {
    href += `/${segment}`;
    crumbs.push({
      href,
      label: labelForSegment(segment, previous, role, entityLabel),
    });
    previous.push(segment);
  }

  return crumbs;
}
