import { NextRequest, NextResponse } from "next/server";

import { approveContentForUser } from "@/modules/content/application/content.service";
import { requireAppUser } from "@/modules/identity/application/require-app-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentItemId: string }> },
) {
  try {
    const { contentItemId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      notes?: string;
    };
    const appUser = await requireAppUser();

    await approveContentForUser(appUser.id, contentItemId, body.notes);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to approve content";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
