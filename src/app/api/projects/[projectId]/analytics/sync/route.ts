import { NextResponse } from "next/server";

import { syncProjectAnalyticsForUser } from "@/modules/analytics/application/analytics.service";
import { requireAppUser } from "@/modules/identity/application/require-app-user";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const item = await syncProjectAnalyticsForUser(appUser.id, projectId);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync project analytics";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
