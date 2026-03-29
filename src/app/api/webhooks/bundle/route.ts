import { NextResponse } from "next/server";

import { constructBundleWebhookEvent } from "@/integrations/bundle/bundle-gateway";
import {
  persistBundleWebhookEvent,
  processBundleWebhookEvent,
} from "@/modules/project/application/project-bundle-webhook.service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-signature header" }, { status: 400 });
    }

    const event = constructBundleWebhookEvent({
      rawBody,
      signature,
    });

    await persistBundleWebhookEvent({
      rawBody,
      event,
    });
    await processBundleWebhookEvent(event);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process bundle webhook";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
