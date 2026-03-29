import { NextResponse } from "next/server";

import { triggerAutonomousCycleForProject } from "@/modules/admin-lab/application/admin-lab.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requirePlatformAdmin();
    const item = await triggerAutonomousCycleForProject(appUser.id, projectId);

    return NextResponse.json({ item }, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger autonomous cycle";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
