import { z } from "zod";

export const generatedPillarSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(8).max(240),
  priority: z.number().int().min(1).max(100),
});

export const generatedPillarsSchema = z.object({
  pillars: z.array(generatedPillarSchema).min(3).max(6),
});

export const generatedCalendarSlotSchema = z.object({
  dayOffset: z.number().int().min(0).max(6),
  platform: z.enum(["INSTAGRAM", "TIKTOK"]),
  format: z.enum([
    "REEL",
    "CAROUSEL",
    "STORY",
    "SHORT_VIDEO",
    "TALKING_HEAD",
    "BROLL",
  ]),
  pillarName: z.string().min(2).max(80),
  objective: z.string().min(6).max(120),
  brief: z.string().min(12).max(280),
});

export const generatedWeeklyCalendarSchema = z.object({
  rationale: z.string().min(12).max(400),
  slots: z.array(generatedCalendarSlotSchema).min(4).max(10),
});

export type GeneratedPillars = z.infer<typeof generatedPillarsSchema>;
export type GeneratedWeeklyCalendar = z.infer<typeof generatedWeeklyCalendarSchema>;
