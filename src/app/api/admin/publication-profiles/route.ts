import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";
import { listPublicationProfilesForAdmin } from "@/modules/profiles/application/profile.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const items = await listPublicationProfilesForAdmin();

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list publication profiles";

    return NextResponse.json({ error: message }, { status: 403 });
  }
}
