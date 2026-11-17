import { z } from "zod";

export const programFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  category: z.enum(["Sales", "Files", "Other"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  trainingMode: z.enum(["SCHEDULED", "PROGRESSION"]),
  examScoreThreshold: z.number().min(0).max(100).optional(),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;
