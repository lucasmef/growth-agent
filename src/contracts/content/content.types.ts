export const CONTENT_ITEM_STATUSES = [
  "IDEA",
  "PLANNED",
  "DRAFTING",
  "DRAFT_READY",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "PUBLISH_FAILED",
  "ANALYZED",
] as const;

export type ContentItemStatus = (typeof CONTENT_ITEM_STATUSES)[number];

export const CONTENT_FORMATS = [
  "REEL",
  "CAROUSEL",
  "STORY",
  "SHORT_VIDEO",
  "TALKING_HEAD",
  "BROLL",
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export type DraftPayload = {
  hook: string;
  script: string;
  caption: string;
  cta: string;
  hashtags: string[];
  assetBrief?: string;
};

export type ContentStateTransition =
  | { from: "IDEA"; to: "PLANNED" | "DRAFTING" }
  | { from: "PLANNED"; to: "DRAFTING" | "CHANGES_REQUESTED" }
  | { from: "DRAFTING"; to: "DRAFT_READY" | "PUBLISH_FAILED" }
  | { from: "DRAFT_READY"; to: "CHANGES_REQUESTED" | "APPROVED" }
  | { from: "CHANGES_REQUESTED"; to: "DRAFTING" | "APPROVED" }
  | { from: "APPROVED"; to: "SCHEDULED" | "PUBLISHING" }
  | { from: "SCHEDULED"; to: "PUBLISHING" | "PUBLISH_FAILED" }
  | { from: "PUBLISHING"; to: "PUBLISHED" | "PUBLISH_FAILED" }
  | { from: "PUBLISHED"; to: "ANALYZED" };

export type ContentGenerationInput = {
  projectId: string;
  contentItemId: string;
  platform: "INSTAGRAM" | "TIKTOK";
  format: ContentFormat;
  brief: string;
  toneOfVoice: string;
  editorialRules: string[];
  bannedTopics: string[];
  bannedClaims: string[];
  recentPosts: Array<{
    title?: string;
    caption?: string;
    platform: "INSTAGRAM" | "TIKTOK";
  }>;
};
