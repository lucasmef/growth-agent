import type { Platform } from "../project/project.types";

export type BundleConnectAccountInput = {
  projectId: string;
  bundleTeamId: string;
  platform: Platform;
  redirectUrl: string;
  serverUrl?: string;
};

export type BundleCreatePostInput = {
  bundleTeamId: string;
  socialAccountIds: string[];
  text: string;
  scheduledAt?: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
};

export type BundlePostResult = {
  bundlePostId: string;
  status: "PENDING" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  scheduledAt?: string;
  publishedAt?: string;
};

export type BundleWebhookEvent = {
  id?: string;
  type: string;
  createdAt?: string;
  data: Record<string, unknown>;
};
