import { z } from "zod";

export const programFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  category: z.string(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  durationWeeks: z.number().int().positive("Duration must be at least 1 week"),
  trainingMode: z.enum(["SCHEDULED", "PROGRESSION"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;
