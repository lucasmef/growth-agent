import { NextResponse } from "next/server";

import { getPublicEnvironmentSnapshot } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "growth-agent",
    timestamp: new Date().toISOString(),
    environment: getPublicEnvironmentSnapshot(),
  });
}
