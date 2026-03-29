import { NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { listProjectsForUser } from "@/modules/project/application/project.service";

export async function GET() {
  const appUser = await requireAppUser();
  const items = await listProjectsForUser(appUser.id);

  return NextResponse.json({
    items,
  });
}

export async function POST() {
  return NextResponse.json(
    {
      message: "Project creation is not implemented yet. Next step: wire Project module + Prisma + auth.",
    },
    { status: 501 },
  );
}
