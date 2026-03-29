import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import {
  createWorkspaceInputSchema,
} from "@/modules/workspace/application/workspace.schemas";
import {
  createWorkspaceForUser,
  listUserWorkspaces,
} from "@/modules/workspace/application/workspace.service";

export async function GET() {
  const appUser = await requireAppUser();
  const items = await listUserWorkspaces(appUser.id);

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const appUser = await requireAppUser();
    const body = await request.json();
    const input = createWorkspaceInputSchema.parse(body);
    const workspace = await createWorkspaceForUser(appUser.id, input);

    return NextResponse.json({ item: workspace }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create workspace";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
