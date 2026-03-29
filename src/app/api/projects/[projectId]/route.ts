import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { getProjectForUser } from "@/modules/project/application/project.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const project = await getProjectForUser(appUser.id, projectId);

    return NextResponse.json({ item: project });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch project";

    return NextResponse.json({ error: message }, { status: 404 });
  }
}
