import { NextRequest, NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";
import { promoteExperimentToProfileInputSchema } from "@/modules/profiles/application/profile.schemas";
import { promoteExperimentRunToProfile } from "@/modules/profiles/application/profile.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ experimentRunId: string }> },
) {
  try {
    const { experimentRunId } = await params;
    const appUser = await requirePlatformAdmin();
    const body = await request.json();
    const input = promoteExperimentToProfileInputSchema.parse(body);
    const item = await promoteExperimentRunToProfile(
      appUser.id,
      experimentRunId,
      input,
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to promote experiment";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
