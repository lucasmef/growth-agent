import { z } from "zod";

export const createAdminLabWorkspaceInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const createExperimentProjectInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(2).default("America/Sao_Paulo"),
});

export const startExperimentRunInputSchema = z.object({
  hypothesis: z.string().trim().max(240).optional(),
  objective: z.string().trim().max(240).optional(),
});

export const stopExperimentRunInputSchema = z.object({
  summary: z.string().trim().max(400).optional(),
});

export type CreateAdminLabWorkspaceInput = z.infer<
  typeof createAdminLabWorkspaceInputSchema
>;
export type CreateExperimentProjectInput = z.infer<
  typeof createExperimentProjectInputSchema
>;
export type StartExperimentRunInput = z.infer<
  typeof startExperimentRunInputSchema
>;
export type StopExperimentRunInput = z.infer<
  typeof stopExperimentRunInputSchema
>;
