import { NextRequest, NextResponse } from "next/server";

import {
  createExperimentProjectInputSchema,
} from "@/modules/admin-lab/application/admin-lab.schemas";
import { createExperimentProjectForWorkspace } from "@/modules/admin-lab/application/admin-lab.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const appUser = await requirePlatformAdmin();
    const body = await request.json();
    const input = createExperimentProjectInputSchema.parse(body);
    const item = await createExperimentProjectForWorkspace(
      appUser.id,
      workspaceId,
      input,
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create experiment project";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
