import {
  AnalyticsScope,
  Platform,
  Prisma,
  ProjectMode,
  WorkspaceType,
} from "@prisma/client";

import {
  getBundlePostAnalytics,
  getBundleSocialAccountAnalytics,
} from "@/integrations/bundle/bundle-gateway";
import { db } from "@/lib/db";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function platformToBundleType(platform: Platform) {
  return platform === Platform.INSTAGRAM ? "INSTAGRAM" : "TIKTOK";
}

function getLatestAnalyticsItem<T extends { updatedAt: string | null; createdAt: string | null }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
    const rightDate = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();

    return rightDate - leftDate;
  })[0];
}

function normalizeSocialMetrics(
  item:
    | {
        impressions: number;
        impressionsUnique: number;
        views: number;
        viewsUnique: number;
        likes: number;
        comments: number;
        postCount: number;
        followers: number;
        following: number;
      }
    | undefined,
) {
  return {
    impressions: item?.impressions ?? 0,
    impressionsUnique: item?.impressionsUnique ?? 0,
    views: item?.views ?? 0,
    viewsUnique: item?.viewsUnique ?? 0,
    likes: item?.likes ?? 0,
    comments: item?.comments ?? 0,
    followers: item?.followers ?? 0,
    following: item?.following ?? 0,
    postCount: item?.postCount ?? 0,
  };
}

function normalizePostMetrics(
  item:
    | {
        impressions: number;
        impressionsUnique: number;
        views: number;
        viewsUnique: number;
        likes: number;
        dislikes: number;
        comments: number;
        shares: number;
        saves: number;
      }
    | undefined,
) {
  const impressions = item?.impressions ?? 0;
  const interactions =
    (item?.likes ?? 0) +
    (item?.comments ?? 0) +
    (item?.shares ?? 0) +
    (item?.saves ?? 0);

  return {
    impressions,
    impressionsUnique: item?.impressionsUnique ?? 0,
    views: item?.views ?? 0,
    viewsUnique: item?.viewsUnique ?? 0,
    likes: item?.likes ?? 0,
    dislikes: item?.dislikes ?? 0,
    comments: item?.comments ?? 0,
    shares: item?.shares ?? 0,
    saves: item?.saves ?? 0,
    interactions,
    engagementRate: impressions > 0 ? Number((interactions / impressions).toFixed(4)) : 0,
  };
}

async function getProjectForAnalytics(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspace: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      socialAccounts: true,
      contentItems: {
        include: {
          publications: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  return project;
}

export async function syncSocialAccountAnalyticsForProject(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      socialAccounts: true,
    },
  });

  if (!project?.bundleTeamId) {
    return [];
  }

  const snapshots = [];

  for (const socialAccount of project.socialAccounts) {
    if (!socialAccount.bundleSocialAccountId) {
      continue;
    }

    const response = await getBundleSocialAccountAnalytics({
      teamId: project.bundleTeamId,
      platformType: platformToBundleType(socialAccount.platform),
    });
    const latestItem = getLatestAnalyticsItem(response.items);
    const metrics = normalizeSocialMetrics(latestItem);
    const snapshotDate = new Date(latestItem?.updatedAt ?? latestItem?.createdAt ?? Date.now());

    const snapshot = await db.analyticsSnapshot.create({
      data: {
        projectId: project.id,
        socialAccountId: socialAccount.id,
        scope: AnalyticsScope.SOCIAL_ACCOUNT,
        snapshotDate,
        metrics: toJsonValue(metrics),
        rawPayload: toJsonValue(response),
      },
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

export async function syncContentAnalyticsForProject(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      contentItems: {
        include: {
          publications: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!project) {
    return [];
  }

  const snapshots = [];

  for (const contentItem of project.contentItems) {
    const latestPublication = contentItem.publications[0];

    if (!latestPublication?.bundlePostId) {
      continue;
    }

    const response = await getBundlePostAnalytics({
      postId: latestPublication.bundlePostId,
      platformType: platformToBundleType(contentItem.platform),
    });
    const latestItem = getLatestAnalyticsItem(response.items);
    const metrics = normalizePostMetrics(latestItem);
    const snapshotDate = new Date(latestItem?.updatedAt ?? latestItem?.createdAt ?? Date.now());

    const snapshot = await db.analyticsSnapshot.create({
      data: {
        projectId: project.id,
        contentItemId: contentItem.id,
        scope: AnalyticsScope.CONTENT_ITEM,
        snapshotDate,
        metrics: toJsonValue(metrics),
        rawPayload: toJsonValue(response),
      },
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

export async function syncContentAnalyticsByBundlePostId(bundlePostId: string) {
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

  const response = await getBundlePostAnalytics({
    postId: bundlePostId,
    platformType: platformToBundleType(publication.contentItem.platform),
  });
  const latestItem = getLatestAnalyticsItem(response.items);
  const metrics = normalizePostMetrics(latestItem);
  const snapshotDate = new Date(latestItem?.updatedAt ?? latestItem?.createdAt ?? Date.now());

  return db.analyticsSnapshot.create({
    data: {
      projectId: publication.contentItem.projectId,
      contentItemId: publication.contentItemId,
      scope: AnalyticsScope.CONTENT_ITEM,
      snapshotDate,
      metrics: toJsonValue(metrics),
      rawPayload: toJsonValue(response),
    },
  });
}

export async function buildProjectAnalyticsSummary(projectId: string) {
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      analyticsSnapshots: {
        orderBy: {
          snapshotDate: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const latestContentByItemId = new Map<string, (typeof project.analyticsSnapshots)[number]>();
  const latestSocialByAccountId = new Map<string, (typeof project.analyticsSnapshots)[number]>();

  for (const snapshot of project.analyticsSnapshots) {
    if (
      snapshot.scope === AnalyticsScope.CONTENT_ITEM &&
      snapshot.contentItemId &&
      !latestContentByItemId.has(snapshot.contentItemId)
    ) {
      latestContentByItemId.set(snapshot.contentItemId, snapshot);
    }

    if (
      snapshot.scope === AnalyticsScope.SOCIAL_ACCOUNT &&
      snapshot.socialAccountId &&
      !latestSocialByAccountId.has(snapshot.socialAccountId)
    ) {
      latestSocialByAccountId.set(snapshot.socialAccountId, snapshot);
    }
  }

  let impressions = 0;
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let saves = 0;
  let interactions = 0;
  let followers = 0;

  for (const snapshot of latestContentByItemId.values()) {
    const metrics = snapshot.metrics as Record<string, unknown>;
    impressions += Number(metrics.impressions ?? 0);
    views += Number(metrics.views ?? 0);
    likes += Number(metrics.likes ?? 0);
    comments += Number(metrics.comments ?? 0);
    shares += Number(metrics.shares ?? 0);
    saves += Number(metrics.saves ?? 0);
    interactions += Number(metrics.interactions ?? 0);
  }

  for (const snapshot of latestSocialByAccountId.values()) {
    const metrics = snapshot.metrics as Record<string, unknown>;
    followers += Number(metrics.followers ?? 0);
  }

  return {
    impressions,
    views,
    likes,
    comments,
    shares,
    saves,
    interactions,
    followers,
    engagementRate: impressions > 0 ? Number((interactions / impressions).toFixed(4)) : 0,
    syncedContentItems: latestContentByItemId.size,
    syncedSocialAccounts: latestSocialByAccountId.size,
    lastComputedAt: new Date().toISOString(),
  };
}

export async function syncProjectAnalytics(projectId: string) {
  const [socialSnapshots, contentSnapshots] = await Promise.all([
    syncSocialAccountAnalyticsForProject(projectId),
    syncContentAnalyticsForProject(projectId),
  ]);

  const summary = await buildProjectAnalyticsSummary(projectId);

  await db.analyticsSnapshot.create({
    data: {
      projectId,
      scope: AnalyticsScope.PROJECT,
      snapshotDate: new Date(),
      metrics: toJsonValue(summary),
      rawPayload: toJsonValue({
        socialSnapshotCount: socialSnapshots.length,
        contentSnapshotCount: contentSnapshots.length,
      }),
    },
  });

  return {
    socialSnapshotCount: socialSnapshots.length,
    contentSnapshotCount: contentSnapshots.length,
    summary,
  };
}

export async function syncProjectAnalyticsForUser(userId: string, projectId: string) {
  await getProjectForAnalytics(userId, projectId);

  return syncProjectAnalytics(projectId);
}

export async function listRunningExperimentProjectsForAnalytics() {
  return db.project.findMany({
    where: {
      mode: ProjectMode.EXPERIMENT,
      workspace: {
        type: WorkspaceType.ADMIN_LAB,
      },
      experimentRuns: {
        some: {
          status: "RUNNING",
        },
      },
    },
    select: {
      id: true,
    },
  });
}
