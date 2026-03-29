import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { recommendPublicationProfilesForProject } from "@/modules/profiles/application/profile-insights.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const items = await recommendPublicationProfilesForProject(appUser.id, projectId);

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to recommend publication profiles";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
