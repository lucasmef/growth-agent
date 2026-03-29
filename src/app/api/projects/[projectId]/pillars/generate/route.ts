import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { generatePillarsForProject } from "@/modules/planning/application/planning.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const pillars = await generatePillarsForProject(appUser.id, projectId);

    return NextResponse.json({ items: pillars }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate pillars";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
