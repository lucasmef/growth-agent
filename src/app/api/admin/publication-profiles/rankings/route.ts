import { NextResponse } from "next/server";

import { listPublicationProfileRankingsForAdmin } from "@/modules/profiles/application/profile-insights.service";

export async function GET() {
  try {
    const items = await listPublicationProfileRankingsForAdmin();

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list publication profile rankings";

    return NextResponse.json({ error: message }, { status: 403 });
  }
}
