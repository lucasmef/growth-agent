import { z } from "zod";

export const generatedDraftSchema = z.object({
  title: z.string().min(4).max(120),
  hook: z.string().min(6).max(180),
  script: z.string().min(20).max(2400),
  caption: z.string().min(12).max(2200),
  cta: z.string().min(4).max(160),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(10),
  assetBrief: z.string().min(10).max(300),
});

export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;
