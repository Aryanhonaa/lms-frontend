import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
