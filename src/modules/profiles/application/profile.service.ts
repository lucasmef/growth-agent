import {
  ExperimentRunStatus,
  Prisma,
  PublicationProfileStatus,
  WorkspaceType,
} from "@prisma/client";

import { db } from "@/lib/db";
import { createRandomSuffix, slugify } from "@/lib/slug";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

import type {
  AssignPublicationProfileInput,
  PromoteExperimentToProfileInput,
} from "./profile.schemas";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function generateUniqueProfileSlug(name: string) {
  const baseSlug = slugify(name);
  let candidate = baseSlug || `profile-${createRandomSuffix()}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await db.publicationProfile.findUnique({
      where: {
        slug: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${createRandomSuffix()}`;
  }

  return `profile-${createRandomSuffix()}`;
}

export async function listActivePublicationProfiles() {
  return db.publicationProfile.findMany({
    where: {
      status: PublicationProfileStatus.ACTIVE,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function listPublicationProfilesForAdmin() {
  await requirePlatformAdmin();

  return db.publicationProfile.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sourceProject: true,
      experimentRuns: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
      assignedProjects: {
        select: {
          id: true,
          name: true,
          mode: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

export async function promoteExperimentRunToProfile(
  userId: string,
  experimentRunId: string,
  input: PromoteExperimentToProfileInput,
) {
  await requirePlatformAdmin();

  const experimentRun = await db.experimentRun.findFirst({
    where: {
      id: experimentRunId,
      project: {
        workspace: {
          type: WorkspaceType.ADMIN_LAB,
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
          strategy: true,
          pillars: {
            orderBy: {
              priority: "desc",
            },
          },
          socialAccounts: true,
        },
      },
      publicationProfile: true,
    },
  });

  if (!experimentRun) {
    throw new Error("Experiment run not found or access denied");
  }

  if (experimentRun.status === ExperimentRunStatus.RUNNING) {
    throw new Error("Stop the experiment before promoting it to a profile");
  }

  if (experimentRun.publicationProfile) {
    return experimentRun.publicationProfile;
  }

  const slug = await generateUniqueProfileSlug(input.name);
  const strategy = experimentRun.project.strategy;
  const recommendedPlatforms = Array.from(
    new Set(experimentRun.project.socialAccounts.map((account) => account.platform)),
  );

  const publicationProfile = await db.publicationProfile.create({
    data: {
      createdByUserId: userId,
      sourceProjectId: experimentRun.projectId,
      name: input.name,
      slug,
      description: input.description ?? experimentRun.summary ?? null,
      status: PublicationProfileStatus.ACTIVE,
      platformScope: recommendedPlatforms,
      strategyPreset: strategy
        ? toJsonValue({
            targetAudience: strategy.targetAudience,
            toneOfVoice: strategy.toneOfVoice,
            primaryGoal: strategy.primaryGoal,
            secondaryGoals: strategy.secondaryGoals,
            offerDescription: strategy.offerDescription,
          })
        : undefined,
      planningPreset: toJsonValue({
        pillars: experimentRun.project.pillars.map((pillar) => ({
          name: pillar.name,
          description: pillar.description,
          priority: pillar.priority,
        })),
      }),
      publishingPreset: toJsonValue({
        recommendedPlatforms,
        defaultApprovalMode: "MANUAL_REQUIRED",
      }),
      guardrails: strategy
        ? toJsonValue({
            editorialRules: strategy.editorialRules,
            bannedTopics: strategy.bannedTopics,
            bannedClaims: strategy.bannedClaims,
          })
        : undefined,
      successCriteria: toJsonValue({
        hypothesis: experimentRun.hypothesis,
        objective: experimentRun.objective,
        summary: experimentRun.summary,
        baselineMetrics: experimentRun.baselineMetrics,
        resultMetrics: experimentRun.resultMetrics,
      }),
    },
  });

  await db.experimentRun.update({
    where: {
      id: experimentRun.id,
    },
    data: {
      status: ExperimentRunStatus.PROMOTED,
      publicationProfileId: publicationProfile.id,
      promotedAt: new Date(),
    },
  });

  return publicationProfile;
}

export async function assignPublicationProfileToProject(
  userId: string,
  projectId: string,
  input: AssignPublicationProfileInput,
) {
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
      strategy: true,
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  let profile = null;

  if (input.publicationProfileId) {
    profile = await db.publicationProfile.findFirst({
      where: {
        id: input.publicationProfileId,
        status: PublicationProfileStatus.ACTIVE,
      },
    });

    if (!profile) {
      throw new Error("Publication profile not found");
    }
  }

  return db.$transaction(async (tx) => {
    const updatedProject = await tx.project.update({
      where: {
        id: project.id,
      },
      data: {
        publicationProfileId: profile?.id ?? null,
      },
    });

    if (!project.strategy && profile?.strategyPreset && typeof profile.strategyPreset === "object") {
      const preset = profile.strategyPreset as Record<string, unknown>;

      await tx.projectStrategy.create({
        data: {
          projectId: project.id,
          targetAudience: String(preset.targetAudience ?? "Audience from publication profile"),
          toneOfVoice: String(preset.toneOfVoice ?? "Clear and practical"),
          primaryGoal: String(preset.primaryGoal ?? "Grow the profile"),
          secondaryGoals: Array.isArray(preset.secondaryGoals)
            ? preset.secondaryGoals
            : [],
          offerDescription:
            typeof preset.offerDescription === "string"
              ? preset.offerDescription
              : null,
        },
      });
    }

    return updatedProject;
  });
}
