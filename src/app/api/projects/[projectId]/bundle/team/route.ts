import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { ensureProjectBundleTeamForUser } from "@/modules/project/application/project-bundle.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const project = await ensureProjectBundleTeamForUser(appUser.id, projectId);

    return NextResponse.json({ item: project });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ensure bundle team";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
