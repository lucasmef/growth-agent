import { NextRequest, NextResponse } from "next/server";

import {
  stopExperimentRunInputSchema,
} from "@/modules/admin-lab/application/admin-lab.schemas";
import { stopExperimentRunForProject } from "@/modules/admin-lab/application/admin-lab.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requirePlatformAdmin();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = stopExperimentRunInputSchema.parse(body);
    const item = await stopExperimentRunForProject(appUser.id, projectId, input);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to stop experiment";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
