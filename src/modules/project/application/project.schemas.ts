import { z } from "zod";

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(2).default("America/Sao_Paulo"),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
