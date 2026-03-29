import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { createProjectBundlePortalLinkForUser } from "@/modules/project/application/project-bundle.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      redirectUrl?: string;
    };
    const appUser = await requireAppUser();
    const result = await createProjectBundlePortalLinkForUser({
      userId: appUser.id,
      projectId,
      redirectUrl: body.redirectUrl,
    });

    return NextResponse.json({ item: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create portal link";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
