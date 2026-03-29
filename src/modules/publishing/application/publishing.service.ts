import {
  AssetType,
  ContentItemStatus,
  Prisma,
  PublicationStatus,
} from "@prisma/client";

import { createBundlePost, getBundlePost } from "@/integrations/bundle/bundle-gateway";
import { db } from "@/lib/db";

type ManagedAssetType = "IMAGE" | "VIDEO";

function mapBundlePostStatus(status: string): PublicationStatus {
  switch (status) {
    case "SCHEDULED":
      return PublicationStatus.SCHEDULED;
    case "POSTED":
      return PublicationStatus.PUBLISHED;
    case "ERROR":
      return PublicationStatus.FAILED;
    case "DELETED":
      return PublicationStatus.CANCELED;
    default:
      return PublicationStatus.PUBLISHING;
  }
}

function mapContentStatus(status: PublicationStatus): ContentItemStatus {
  switch (status) {
    case PublicationStatus.SCHEDULED:
      return ContentItemStatus.SCHEDULED;
    case PublicationStatus.PUBLISHED:
      return ContentItemStatus.PUBLISHED;
    case PublicationStatus.FAILED:
    case PublicationStatus.CANCELED:
      return ContentItemStatus.PUBLISH_FAILED;
    default:
      return ContentItemStatus.PUBLISHING;
  }
}

function mapInstagramType(format: string) {
  if (format === "STORY") {
    return "STORY" as const;
  }

  if (["REEL", "SHORT_VIDEO", "TALKING_HEAD", "BROLL"].includes(format)) {
    return "REEL" as const;
  }

  return "POST" as const;
}

function mapTiktokType(assetType: ManagedAssetType) {
  return assetType === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const);
}

function readBundleErrorMessage(post: {
  error?: string | null;
  errors?: Record<string, string | null> | null;
}) {
  if (post.error) {
    return post.error;
  }

  if (!post.errors) {
    return null;
  }

  const firstProviderError = Object.values(post.errors).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return firstProviderError ?? null;
}

function toJsonPayload(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function getContentItemForPublishing(userId: string, contentItemId: string) {
  const contentItem = await db.contentItem.findFirst({
    where: {
      id: contentItemId,
      project: {
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    },
    include: {
      project: {
        include: {
          socialAccounts: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
      },
      assets: {
        orderBy: {
          createdAt: "asc",
        },
      },
      publications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!contentItem) {
    throw new Error("Content item not found or access denied");
  }

  return contentItem;
}

export async function attachBundleUploadToContent(input: {
  userId: string;
  contentItemId: string;
  bundleUploadId: string;
  assetType: ManagedAssetType;
}) {
  const contentItem = await getContentItemForPublishing(input.userId, input.contentItemId);

  const existingAsset = await db.asset.findFirst({
    where: {
      contentItemId: contentItem.id,
      bundleUploadId: input.bundleUploadId,
    },
  });

  if (existingAsset) {
    return existingAsset;
  }

  return db.asset.create({
    data: {
      projectId: contentItem.projectId,
      contentItemId: contentItem.id,
      type: input.assetType === "VIDEO" ? AssetType.VIDEO : AssetType.IMAGE,
      source: "bundle-upload",
      bundleUploadId: input.bundleUploadId,
      metadata: {
        managedManually: true,
      },
    },
  });
}

async function publishContentInternal(input: {
  userId: string;
  contentItemId: string;
  scheduledFor: Date;
}) {
  const contentItem = await getContentItemForPublishing(input.userId, input.contentItemId);

  if (contentItem.status !== ContentItemStatus.APPROVED) {
    throw new Error("Only approved content can be published or scheduled");
  }

  const latestPublication = contentItem.publications[0];

  if (
    latestPublication &&
    (latestPublication.status === PublicationStatus.SCHEDULED ||
      latestPublication.status === PublicationStatus.PUBLISHING ||
      latestPublication.status === PublicationStatus.PUBLISHED)
  ) {
    throw new Error("Content already has an active publication");
  }

  if (!contentItem.project.bundleTeamId) {
    throw new Error("Project bundle team is missing");
  }

  const socialAccount = contentItem.project.socialAccounts.find(
    (account) => account.platform === contentItem.platform && account.status === "CONNECTED",
  );

  if (!socialAccount) {
    throw new Error(`No connected ${contentItem.platform} social account found`);
  }

  const latestVersion = contentItem.versions[0];

  if (!latestVersion) {
    throw new Error("No generated draft found for this content item");
  }

  const uploadIds = contentItem.assets
    .map((asset) => asset.bundleUploadId)
    .filter((asset): asset is string => Boolean(asset));

  if (uploadIds.length === 0) {
    throw new Error("At least one bundle upload id is required before publishing");
  }

  const primaryAssetType =
    contentItem.assets[0]?.type === AssetType.VIDEO ? "VIDEO" : "IMAGE";

  const post =
    contentItem.platform === "INSTAGRAM"
      ? await createBundlePost({
          requestBody: {
            teamId: contentItem.project.bundleTeamId,
            title: contentItem.title ?? latestVersion.hook,
            postDate: input.scheduledFor.toISOString(),
            status: "SCHEDULED",
            socialAccountTypes: ["INSTAGRAM"],
            data: {
              INSTAGRAM: {
                type: mapInstagramType(contentItem.format),
                text: latestVersion.caption,
                uploadIds,
              },
            },
          },
        })
      : await createBundlePost({
          requestBody: {
            teamId: contentItem.project.bundleTeamId,
            title: contentItem.title ?? latestVersion.hook,
            postDate: input.scheduledFor.toISOString(),
            status: "SCHEDULED",
            socialAccountTypes: ["TIKTOK"],
            data: {
              TIKTOK: {
                type: mapTiktokType(primaryAssetType),
                text: latestVersion.caption,
                uploadIds,
                privacy: "PUBLIC_TO_EVERYONE",
              },
            },
          },
        });

  const publicationStatus = mapBundlePostStatus(post.status);

  const publication = await db.publication.create({
    data: {
      contentItemId: contentItem.id,
      bundlePostId: post.id,
      status: publicationStatus,
      scheduledFor: post.postDate ? new Date(post.postDate) : input.scheduledFor,
      publishedAt: post.postedDate ? new Date(post.postedDate) : null,
      errorMessage: readBundleErrorMessage(post),
      metadata: toJsonPayload(post),
    },
  });

  await db.contentItem.update({
    where: {
      id: contentItem.id,
    },
    data: {
      status: mapContentStatus(publicationStatus),
      scheduledFor: publication.scheduledFor,
      publishedAt: publication.publishedAt,
    },
  });

  return publication;
}

export async function scheduleApprovedContentForUser(
  userId: string,
  contentItemId: string,
) {
  const contentItem = await getContentItemForPublishing(userId, contentItemId);

  const scheduledFor =
    contentItem.scheduledFor ??
    contentItem.publications[0]?.scheduledFor ??
    new Date(Date.now() + 60 * 60 * 1000);

  return publishContentInternal({
    userId,
    contentItemId,
    scheduledFor,
  });
}

export async function publishApprovedContentNowForUser(
  userId: string,
  contentItemId: string,
) {
  return publishContentInternal({
    userId,
    contentItemId,
    scheduledFor: new Date(),
  });
}

export async function syncPublicationByBundlePostId(bundlePostId: string) {
  const publication = await db.publication.findFirst({
    where: {
      bundlePostId,
    },
    include: {
      contentItem: true,
    },
  });

  if (!publication) {
    return null;
  }

  const post = await getBundlePost(bundlePostId);
  const publicationStatus = mapBundlePostStatus(post.status);

  const updatedPublication = await db.publication.update({
    where: {
      id: publication.id,
    },
    data: {
      status: publicationStatus,
      scheduledFor: post.postDate ? new Date(post.postDate) : publication.scheduledFor,
      publishedAt: post.postedDate ? new Date(post.postedDate) : publication.publishedAt,
      errorMessage: readBundleErrorMessage(post),
      metadata: toJsonPayload(post),
    },
  });

  await db.contentItem.update({
    where: {
      id: publication.contentItemId,
    },
    data: {
      status: mapContentStatus(publicationStatus),
      scheduledFor: updatedPublication.scheduledFor,
      publishedAt: updatedPublication.publishedAt,
    },
  });

  return updatedPublication;
}

export async function syncLatestPublicationForUser(
  userId: string,
  contentItemId: string,
) {
  const contentItem = await getContentItemForPublishing(userId, contentItemId);
  const latestPublication = contentItem.publications[0];

  if (!latestPublication?.bundlePostId) {
    throw new Error("No bundle publication found for this content item");
  }

  return syncPublicationByBundlePostId(latestPublication.bundlePostId);
}
