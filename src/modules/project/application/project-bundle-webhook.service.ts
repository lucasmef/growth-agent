import crypto from "node:crypto";

import type { WebhookEvent } from "bundlesocial";

import { db } from "@/lib/db";

import {
  markProjectBundleTeamDeleted,
  syncProjectBundleStateByTeamId,
} from "./project-bundle.service";

function createEventFingerprint(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

function toJsonPayload(event: WebhookEvent) {
  return JSON.parse(JSON.stringify(event));
}

export async function persistBundleWebhookEvent(input: {
  rawBody: string;
  event: WebhookEvent;
}) {
  const fingerprint = createEventFingerprint(input.rawBody);

  return db.webhookEvent.upsert({
    where: {
      provider_externalEventId: {
        provider: "bundle.social",
        externalEventId: fingerprint,
      },
    },
    update: {
      payload: toJsonPayload(input.event),
      processedAt: new Date(),
    },
    create: {
      provider: "bundle.social",
      externalEventId: fingerprint,
      eventType: input.event.type,
      payload: toJsonPayload(input.event),
      processedAt: new Date(),
    },
  });
}

export async function processBundleWebhookEvent(event: WebhookEvent) {
  switch (event.type) {
    case "team.created":
    case "team.updated": {
      await syncProjectBundleStateByTeamId(event.data.id);
      break;
    }
    case "team.deleted": {
      await markProjectBundleTeamDeleted(event.data.id);
      break;
    }
    case "social-account.created":
    case "social-account.updated":
    case "social-account.deleted": {
      await syncProjectBundleStateByTeamId(event.data.teamId);
      break;
    }
    default: {
      return;
    }
  }
}
