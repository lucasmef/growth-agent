export const PROJECT_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PLATFORMS = ["INSTAGRAM", "TIKTOK"] as const;

export type Platform = (typeof PLATFORMS)[number];

export type StrategicOnboardingInput = {
  niche: string;
  targetAudience: string;
  toneOfVoice: string;
  primaryGoal: string;
  secondaryGoals: string[];
  offerDescription?: string;
  editorialRules: string[];
  bannedTopics: string[];
  bannedClaims: string[];
};

export type ContentPillarDraft = {
  name: string;
  description: string;
  priority: number;
};

export type CalendarSlotDraft = {
  platform: Platform;
  format:
    | "REEL"
    | "CAROUSEL"
    | "STORY"
    | "SHORT_VIDEO"
    | "TALKING_HEAD"
    | "BROLL";
  plannedFor: string;
  objective: string;
  pillarName?: string;
  brief: string;
};
