import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { generateWeeklyCalendarForProject } from "@/modules/planning/application/planning.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const appUser = await requireAppUser();
    const result = await generateWeeklyCalendarForProject(appUser.id, projectId);

    return NextResponse.json({ item: result }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate calendar";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
