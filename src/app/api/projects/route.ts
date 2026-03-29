import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    items: [],
    message: "Project listing is not implemented yet. The domain scaffold is ready for the next slice.",
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
