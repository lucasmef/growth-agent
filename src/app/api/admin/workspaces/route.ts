import { NextRequest, NextResponse } from "next/server";

import {
  createAdminLabWorkspaceInputSchema,
} from "@/modules/admin-lab/application/admin-lab.schemas";
import {
  createAdminLabWorkspaceForUser,
  listAdminLabWorkspacesForUser,
} from "@/modules/admin-lab/application/admin-lab.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

export async function GET() {
  try {
    const appUser = await requirePlatformAdmin();
    const items = await listAdminLabWorkspacesForUser(appUser.id);

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list admin labs";

    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const appUser = await requirePlatformAdmin();
    const body = await request.json();
    const input = createAdminLabWorkspaceInputSchema.parse(body);
    const item = await createAdminLabWorkspaceForUser(appUser.id, input);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create admin lab";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
