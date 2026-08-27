import type { Role } from "@/types/domain";

export function getDashboardPath(role: Role): "/admin" | "/trainer" | "/trainee" {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return "/admin";
  }

  if (role === "TRAINER") {
    return "/trainer";
  }

  return "/trainee";
}
