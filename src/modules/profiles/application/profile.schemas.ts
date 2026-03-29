import { z } from "zod";

export const promoteExperimentToProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
});

export const assignPublicationProfileInputSchema = z.object({
  publicationProfileId: z.string().trim().optional().nullable(),
});

export type PromoteExperimentToProfileInput = z.infer<
  typeof promoteExperimentToProfileInputSchema
>;
export type AssignPublicationProfileInput = z.infer<
  typeof assignPublicationProfileInputSchema
>;
