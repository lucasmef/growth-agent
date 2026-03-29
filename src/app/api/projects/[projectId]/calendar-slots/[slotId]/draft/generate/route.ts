import { NextResponse } from "next/server";

import { generateDraftForCalendarSlot } from "@/modules/content/application/content.service";
import { requireAppUser } from "@/modules/identity/application/require-app-user";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; slotId: string }> },
) {
  try {
    const { projectId, slotId } = await params;
    const appUser = await requireAppUser();
    const result = await generateDraftForCalendarSlot(appUser.id, projectId, slotId);

    return NextResponse.json({ item: result }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate draft";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
