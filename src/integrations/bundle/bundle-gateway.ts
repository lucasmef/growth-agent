import type {
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
