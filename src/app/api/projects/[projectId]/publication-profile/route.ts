import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { assignPublicationProfileInputSchema } from "@/modules/profiles/application/profile.schemas";
import { assignPublicationProfileToProject } from "@/modules/profiles/application/profile.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const body = await request.json();
    const input = assignPublicationProfileInputSchema.parse(body);
    const item = await assignPublicationProfileToProject(appUser.id, projectId, input);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign publication profile";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
