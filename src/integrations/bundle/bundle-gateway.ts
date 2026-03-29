import type {
  AnalyticsGetPostAnalyticsResponse,
  AnalyticsGetSocialAccountAnalyticsResponse,
  PostCreateResponse,
  PostGetResponse,
  SocialAccountCreatePortalLinkResponse,
  TeamCreateTeamResponse,
  TeamGetTeamResponse,
  WebhookEvent,
} from "bundlesocial";

import { getAppUrl, getEnv } from "@/lib/env";

import { getBundleClient } from "./bundle-client";

export async function createBundleTeam(name: string) {
  const client = getBundleClient();

  return client.team.teamCreateTeam({
    requestBody: {
      name,
    },
  }) as Promise<TeamCreateTeamResponse>;
}

export async function getBundleTeam(teamId: string) {
  const client = getBundleClient();

  return client.team.teamGetTeam({
    id: teamId,
  }) as Promise<TeamGetTeamResponse>;
}

export async function createBundlePortalLink(input: {
  teamId: string;
  socialAccountTypes: Array<"INSTAGRAM" | "TIKTOK">;
  redirectUrl?: string;
}) {
  const client = getBundleClient();

  return client.socialAccount.socialAccountCreatePortalLink({
    requestBody: {
      teamId: input.teamId,
      redirectUrl:
        input.redirectUrl ?? `${getAppUrl()}/dashboard?bundle=connected`,
      socialAccountTypes: input.socialAccountTypes,
      language: "pt",
      disableAutoLogin: true,
      showModalOnConnectSuccess: true,
      expiresIn: 60,
      withBusinessScope: true,
      maxSocialAccountsConnected: 2,
    },
  }) as Promise<SocialAccountCreatePortalLinkResponse>;
}

export async function createBundlePost(input: {
  requestBody: {
    teamId: string;
    title: string;
    postDate: string;
    status: "DRAFT" | "SCHEDULED";
    socialAccountTypes: Array<"INSTAGRAM" | "TIKTOK">;
    data: {
      INSTAGRAM?: {
        type?: "POST" | "REEL" | "STORY";
        text?: string | null;
        uploadIds?: string[] | null;
      } | null;
      TIKTOK?: {
        type?: "VIDEO" | "IMAGE";
        text?: string | null;
        uploadIds?: string[] | null;
        privacy?:
          | "SELF_ONLY"
          | "PUBLIC_TO_EVERYONE"
          | "MUTUAL_FOLLOW_FRIENDS"
          | "FOLLOWER_OF_CREATOR"
          | null;
      } | null;
    };
  };
}) {
  const client = getBundleClient();

  return client.post.postCreate(input) as Promise<PostCreateResponse>;
}

export async function getBundlePost(postId: string) {
  const client = getBundleClient();

  return client.post.postGet({
    id: postId,
  }) as Promise<PostGetResponse>;
}

export async function getBundlePostAnalytics(input: {
  postId?: string;
  importedPostId?: string;
  platformType?: "INSTAGRAM" | "TIKTOK";
}) {
  const client = getBundleClient();

  return client.analytics.analyticsGetPostAnalytics({
    postId: input.postId ?? null,
    importedPostId: input.importedPostId ?? null,
    platformType: input.platformType ?? null,
  }) as Promise<AnalyticsGetPostAnalyticsResponse>;
}

export async function getBundleSocialAccountAnalytics(input: {
  teamId: string;
  platformType: "INSTAGRAM" | "TIKTOK";
}) {
  const client = getBundleClient();

  return client.analytics.analyticsGetSocialAccountAnalytics({
    teamId: input.teamId,
    platformType: input.platformType,
  }) as Promise<AnalyticsGetSocialAccountAnalyticsResponse>;
}

export function constructBundleWebhookEvent(input: {
  rawBody: string;
  signature: string;
}) {
  const env = getEnv();

  if (!env.BUNDLE_SOCIAL_WEBHOOK_SECRET) {
    throw new Error("BUNDLE_SOCIAL_WEBHOOK_SECRET is not configured");
  }

  const client = getBundleClient();

  return client.webhooks.constructEvent(
    input.rawBody,
    input.signature,
    env.BUNDLE_SOCIAL_WEBHOOK_SECRET,
  ) as WebhookEvent;
}
