import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import {
  createProjectInputSchema,
} from "@/modules/project/application/project.schemas";
import { createProjectForWorkspace } from "@/modules/project/application/project.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const appUser = await requireAppUser();
    const body = await request.json();
    const input = createProjectInputSchema.parse(body);
    const project = await createProjectForWorkspace(appUser.id, workspaceId, input);

    return NextResponse.json({ item: project }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
