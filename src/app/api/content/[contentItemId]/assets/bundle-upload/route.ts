import { NextRequest, NextResponse } from "next/server";

import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { attachBundleUploadToContent } from "@/modules/publishing/application/publishing.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentItemId: string }> },
) {
  try {
    const { contentItemId } = await params;
    const body = (await request.json()) as {
      bundleUploadId?: string;
      assetType?: "IMAGE" | "VIDEO";
    };
    const appUser = await requireAppUser();

    if (!body.bundleUploadId) {
      return NextResponse.json(
        { error: "bundleUploadId is required" },
        { status: 400 },
      );
    }

    if (body.assetType !== "IMAGE" && body.assetType !== "VIDEO") {
      return NextResponse.json(
        { error: "assetType must be IMAGE or VIDEO" },
        { status: 400 },
      );
    }

    const asset = await attachBundleUploadToContent({
      userId: appUser.id,
      contentItemId,
      bundleUploadId: body.bundleUploadId,
      assetType: body.assetType,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to attach bundle upload";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
