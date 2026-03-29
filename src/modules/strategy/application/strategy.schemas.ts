import { z } from "zod";

export const upsertStrategyInputSchema = z.object({
  targetAudience: z.string().trim().min(5).max(240),
  toneOfVoice: z.string().trim().min(2).max(120),
  primaryGoal: z.string().trim().min(2).max(120),
  secondaryGoals: z.array(z.string().trim().min(1)).default([]),
  offerDescription: z.string().trim().max(400).optional().or(z.literal("")),
  editorialRules: z.array(z.string().trim().min(1)).default([]),
  bannedTopics: z.array(z.string().trim().min(1)).default([]),
  bannedClaims: z.array(z.string().trim().min(1)).default([]),
});

export type UpsertStrategyInput = z.infer<typeof upsertStrategyInputSchema>;
