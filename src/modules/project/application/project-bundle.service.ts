import { SocialAccountStatus } from "@prisma/client";
import type { TeamGetTeamResponse } from "bundlesocial";

import { db } from "@/lib/db";
import {
  createBundlePortalLink,
  createBundleTeam,
  getBundleTeam,
} from "@/integrations/bundle/bundle-gateway";
import { bundleAccountTypeToPlatform } from "@/integrations/bundle/bundle-mappers";

import { getProjectForUser } from "./project.service";

function mapBundleStatus(
  account: TeamGetTeamResponse["socialAccounts"][number],
): SocialAccountStatus {
  if (account.deletedAt) {
    return "DISCONNECTED";
  }

  return "CONNECTED";
}

async function syncSupportedSocialAccountsForProject(
  projectId: string,
  team: TeamGetTeamResponse,
) {
  const supportedAccounts = team.socialAccounts.filter((account) =>
    ["INSTAGRAM", "TIKTOK"].includes(account.type),
  );

  const activeBundleIds = new Set(supportedAccounts.map((account) => account.id));

  await Promise.all(
    supportedAccounts.map(async (account) => {
      const platform = bundleAccountTypeToPlatform(account.type);

      if (!platform) {
        return;
      }

      await db.socialAccount.upsert({
        where: {
          bundleSocialAccountId: account.id,
        },
        update: {
          projectId,
          platform,
          username: account.username ?? null,
          externalAccountId: account.externalId ?? null,
          status: mapBundleStatus(account),
          metadata: account,
          connectedAt: account.createdAt ? new Date(account.createdAt) : null,
        },
        create: {
          projectId,
          platform,
          username: account.username ?? null,
          externalAccountId: account.externalId ?? null,
          bundleSocialAccountId: account.id,
          status: mapBundleStatus(account),
          metadata: account,
          connectedAt: account.createdAt ? new Date(account.createdAt) : null,
        },
      });
    }),
  );

  const staleAccounts = await db.socialAccount.findMany({
    where: {
      projectId,
      platform: {
        in: ["INSTAGRAM", "TIKTOK"],
      },
      bundleSocialAccountId: {
        not: null,
      },
    },
    select: {
      id: true,
      bundleSocialAccountId: true,
    },
  });

  await Promise.all(
    staleAccounts
      .filter(
        (account) =>
          account.bundleSocialAccountId &&
          !activeBundleIds.has(account.bundleSocialAccountId),
      )
      .map((account) =>
        db.socialAccount.update({
          where: { id: account.id },
          data: {
            status: "DISCONNECTED",
          },
        }),
      ),
  );
}

export async function ensureProjectBundleTeamForUser(
  userId: string,
  projectId: string,
) {
  const project = await getProjectForUser(userId, projectId);

  if (project.bundleTeamId) {
    return project;
  }

  const createdTeam = await createBundleTeam(`${project.workspace.name} · ${project.name}`);

  return db.project.update({
    where: { id: project.id },
    data: {
      bundleTeamId: createdTeam.id,
    },
    include: {
      workspace: true,
      strategy: true,
      socialAccounts: true,
    },
  });
}

export async function refreshProjectBundleStateForUser(
  userId: string,
  projectId: string,
) {
  const project = await ensureProjectBundleTeamForUser(userId, projectId);

  if (!project.bundleTeamId) {
    throw new Error("Project does not have a bundle team");
  }

  const team = await getBundleTeam(project.bundleTeamId);
  await syncSupportedSocialAccountsForProject(project.id, team);

  return db.project.findUniqueOrThrow({
    where: {
      id: project.id,
    },
    include: {
      workspace: true,
      strategy: true,
      socialAccounts: true,
    },
  });
}

export async function createProjectBundlePortalLinkForUser(input: {
  userId: string;
  projectId: string;
  redirectUrl?: string;
}) {
  const project = await ensureProjectBundleTeamForUser(input.userId, input.projectId);

  if (!project.bundleTeamId) {
    throw new Error("Project does not have a bundle team");
  }

  return createBundlePortalLink({
    teamId: project.bundleTeamId,
    redirectUrl: input.redirectUrl,
    socialAccountTypes: ["INSTAGRAM", "TIKTOK"],
  });
}

export async function syncProjectBundleStateByTeamId(teamId: string) {
  const project = await db.project.findFirst({
    where: {
      bundleTeamId: teamId,
    },
  });

  if (!project) {
    return null;
  }

  const team = await getBundleTeam(teamId);
  await syncSupportedSocialAccountsForProject(project.id, team);

  return project;
}

export async function markProjectBundleTeamDeleted(teamId: string) {
  const project = await db.project.findFirst({
    where: {
      bundleTeamId: teamId,
    },
  });

  if (!project) {
    return null;
  }

  await db.$transaction([
    db.project.update({
      where: {
        id: project.id,
      },
      data: {
        bundleTeamId: null,
      },
    }),
    db.socialAccount.updateMany({
      where: {
        projectId: project.id,
      },
      data: {
        status: "DISCONNECTED",
      },
    }),
  ]);

  return project;
}
