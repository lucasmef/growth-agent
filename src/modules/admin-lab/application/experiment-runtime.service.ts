import {
  ApprovalMode,
  ContentItemStatus,
  ExperimentRunStatus,
  Platform,
  Prisma,
  ProjectMode,
  PublicationStatus,
  SocialAccountStatus,
  WorkspaceType,
} from "@prisma/client";
import { tasks } from "@trigger.dev/sdk";

import { buildProjectAnalyticsSummary, syncProjectAnalytics } from "@/modules/analytics/application/analytics.service";
import { db } from "@/lib/db";
import { isTriggerConfigured } from "@/lib/env";
import { generateDraftForCalendarSlot } from "@/modules/content/application/content.service";
import { generatePillarsForProject, generateWeeklyCalendarForProject } from "@/modules/planning/application/planning.service";
import { scheduleApprovedContentForUser } from "@/modules/publishing/application/publishing.service";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type ExperimentProjectContext = Awaited<ReturnType<typeof getExperimentProjectContext>>;

async function getExperimentProjectContext(projectId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      mode: ProjectMode.EXPERIMENT,
      approvalMode: ApprovalMode.AUTO_APPROVE,
      workspace: {
        type: WorkspaceType.ADMIN_LAB,
      },
    },
    include: {
      workspace: {
        include: {
          members: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      strategy: true,
      publicationProfile: true,
      pillars: {
        orderBy: {
          priority: "desc",
        },
      },
      socialAccounts: true,
      contentItems: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          versions: true,
          assets: true,
          publications: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      calendarWeeks: {
        orderBy: {
          weekStart: "desc",
        },
        take: 1,
        include: {
          slots: {
            orderBy: {
              plannedFor: "asc",
            },
          },
        },
      },
      experimentRuns: {
        where: {
          status: ExperimentRunStatus.RUNNING,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!project) {
    throw new Error("Experiment project not found");
  }

  return project;
}

function selectOperatorUserId(project: ExperimentProjectContext) {
  const operatorUserId = project.workspace.members[0]?.userId;

  if (!operatorUserId) {
    throw new Error("Experiment project has no workspace operator");
  }

  return operatorUserId;
}

function hasConnectedAccount(project: ExperimentProjectContext, platform: Platform) {
  return project.socialAccounts.some(
    (account) =>
      account.platform === platform && account.status === SocialAccountStatus.CONNECTED,
  );
}

function hasPublishableAsset(
  item: ExperimentProjectContext["contentItems"][number],
) {
  return item.assets.some((asset) => Boolean(asset.bundleUploadId));
}

function hasActivePublication(
  item: ExperimentProjectContext["contentItems"][number],
) {
  return item.publications.some(
    (publication) =>
      publication.status === PublicationStatus.SCHEDULED ||
      publication.status === PublicationStatus.PUBLISHING ||
      publication.status === PublicationStatus.PUBLISHED,
  );
}

export async function listRunningExperimentProjectIds() {
  const items = await db.experimentRun.findMany({
    where: {
      status: ExperimentRunStatus.RUNNING,
      project: {
        mode: ProjectMode.EXPERIMENT,
        approvalMode: ApprovalMode.AUTO_APPROVE,
        workspace: {
          type: WorkspaceType.ADMIN_LAB,
        },
      },
    },
    select: {
      projectId: true,
    },
  });

  return Array.from(new Set(items.map((item) => item.projectId)));
}

export async function computeExperimentMetrics(projectId: string) {
  const project = await getExperimentProjectContext(projectId);
  const analyticsSummary = await buildProjectAnalyticsSummary(projectId).catch(() => ({
    impressions: 0,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    interactions: 0,
    followers: 0,
    engagementRate: 0,
    syncedContentItems: 0,
    syncedSocialAccounts: 0,
    lastComputedAt: new Date().toISOString(),
  }));

  const totals = {
    connectedAccounts: project.socialAccounts.filter(
      (account) => account.status === SocialAccountStatus.CONNECTED,
    ).length,
    pillars: project.pillars.length,
    calendarSlots: project.calendarWeeks[0]?.slots.length ?? 0,
    draftsGenerated: project.contentItems.filter((item) => item.versions.length > 0).length,
    approvedItems: project.contentItems.filter((item) => Boolean(item.approvedAt)).length,
    assetsReady: project.contentItems.filter((item) => hasPublishableAsset(item)).length,
    scheduledItems: project.contentItems.filter((item) =>
      item.publications.some(
        (publication) =>
          publication.status === PublicationStatus.SCHEDULED ||
          publication.status === PublicationStatus.PUBLISHING,
      ),
    ).length,
    publishedItems: project.contentItems.filter((item) =>
      item.publications.some(
        (publication) => publication.status === PublicationStatus.PUBLISHED,
      ),
    ).length,
    failedPublications: project.contentItems.filter((item) =>
      item.publications.some(
        (publication) => publication.status === PublicationStatus.FAILED,
      ),
    ).length,
    analytics: analyticsSummary,
  };

  return {
    ...totals,
    lastComputedAt: new Date().toISOString(),
  };
}

export async function updateRunningExperimentMetrics(
  projectId: string,
  note?: Record<string, unknown>,
) {
  const runningRun = await db.experimentRun.findFirst({
    where: {
      projectId,
      status: ExperimentRunStatus.RUNNING,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!runningRun) {
    return null;
  }

  const metrics = await computeExperimentMetrics(projectId);

  return db.experimentRun.update({
    where: {
      id: runningRun.id,
    },
    data: {
      resultMetrics: toJsonValue(metrics),
      notes: note ? toJsonValue(note) : runningRun.notes ?? undefined,
    },
  });
}

export async function runAutonomousExperimentCycle(projectId: string) {
  let project = await getExperimentProjectContext(projectId);
  const runningRun = project.experimentRuns[0];

  if (!runningRun) {
    return {
      skipped: true,
      reason: "no-running-experiment",
    };
  }

  const operatorUserId = selectOperatorUserId(project);
  const actions: string[] = [];
  let generatedDrafts = 0;
  let scheduledPublications = 0;

  if (!project.strategy) {
    throw new Error("Experiment project strategy is missing");
  }

  if (project.pillars.length === 0) {
    await generatePillarsForProject(operatorUserId, projectId);
    actions.push("pillars-generated");
    project = await getExperimentProjectContext(projectId);
  }

  if (!project.calendarWeeks[0]?.slots.length) {
    await generateWeeklyCalendarForProject(operatorUserId, projectId);
    actions.push("calendar-generated");
    project = await getExperimentProjectContext(projectId);
  }

  const latestWeek = project.calendarWeeks[0];
  const existingContentBySlotId = new Set(
    project.contentItems
      .filter((item) => item.calendarSlotId)
      .map((item) => item.calendarSlotId as string),
  );
  const slotsToGenerate = (latestWeek?.slots ?? []).filter(
    (slot) =>
      !existingContentBySlotId.has(slot.id) &&
      hasConnectedAccount(project, slot.platform),
  );

  for (const slot of slotsToGenerate) {
    await generateDraftForCalendarSlot(operatorUserId, projectId, slot.id);
    generatedDrafts += 1;
  }

  if (slotsToGenerate.length > 0) {
    actions.push("drafts-generated");
    project = await getExperimentProjectContext(projectId);
  }

  const itemsToSchedule = project.contentItems.filter(
    (item) =>
      item.status === ContentItemStatus.APPROVED &&
      hasPublishableAsset(item) &&
      !hasActivePublication(item) &&
      hasConnectedAccount(project, item.platform),
  );

  for (const item of itemsToSchedule) {
    await scheduleApprovedContentForUser(operatorUserId, item.id);
    scheduledPublications += 1;
  }

  if (itemsToSchedule.length > 0) {
    actions.push("publications-scheduled");
  }

  const analyticsSync = await syncProjectAnalytics(projectId).catch(() => null);

  if (analyticsSync) {
    actions.push("analytics-synced");
  }

  const updatedRun = await updateRunningExperimentMetrics(projectId, {
    cycleAt: new Date().toISOString(),
    actions,
    generatedDrafts,
    scheduledPublications,
    analyticsSync,
  });

  return {
    skipped: false,
    projectId,
    experimentRunId: runningRun.id,
    generatedDrafts,
    scheduledPublications,
    actions,
    resultMetrics: updatedRun?.resultMetrics ?? null,
  };
}

export async function enqueueAutonomousExperimentCycle(projectId: string) {
  if (isTriggerConfigured()) {
    await tasks.trigger("admin-lab-autonomous-cycle", {
      projectId,
    });

    return {
      mode: "queued" as const,
    };
  }

  const result = await runAutonomousExperimentCycle(projectId);

  return {
    mode: "inline" as const,
    result,
  };
}
