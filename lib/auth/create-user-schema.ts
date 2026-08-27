import { z } from "zod";
import type { Role } from "@/types/domain";

export const CREATABLE_ROLES = ["ADMIN", "TRAINER", "TRAINEE"] as const;

export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export function creatableRolesFor(actor: Role): CreatableRole[] {
  if (actor === "SUPER_ADMIN") {
    return ["ADMIN", "TRAINER", "TRAINEE"];
  }
  if (actor === "ADMIN") {
    return ["TRAINER", "TRAINEE"];
  }
  return [];
}

export function canDeleteRole(actor: Role, target: Role): boolean {
  if (actor === "SUPER_ADMIN") {
    return true;
  }
  if (actor === "ADMIN") {
    return target === "TRAINER" || target === "TRAINEE";
  }
  return false;
}

export const createUserFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().pipe(z.email("Please enter a valid email address.")),
  role: z.enum(CREATABLE_ROLES),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
