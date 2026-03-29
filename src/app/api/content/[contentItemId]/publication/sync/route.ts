import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { syncLatestPublicationForUser } from "@/modules/publishing/application/publishing.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ contentItemId: string }> },
) {
  try {
    const { contentItemId } = await params;
    const appUser = await requireAppUser();
    const publication = await syncLatestPublicationForUser(
      appUser.id,
      contentItemId,
    );

    return NextResponse.json({ publication }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync publication";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
