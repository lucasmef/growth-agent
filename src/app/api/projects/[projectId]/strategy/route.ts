import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import {
  upsertStrategyInputSchema,
} from "@/modules/strategy/application/strategy.schemas";
import { upsertProjectStrategyForUser } from "@/modules/strategy/application/strategy.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const body = await request.json();
    const input = upsertStrategyInputSchema.parse(body);
    const strategy = await upsertProjectStrategyForUser(appUser.id, projectId, input);

    return NextResponse.json({ item: strategy });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update strategy";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
