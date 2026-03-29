import { db } from "@/lib/db";

import { assertWorkspaceMembership } from "@/modules/workspace/application/workspace.service";

import type { CreateProjectInput } from "./project.schemas";

export async function createProjectForWorkspace(
  userId: string,
  workspaceId: string,
  input: CreateProjectInput,
) {
  await assertWorkspaceMembership(userId, workspaceId);

  return db.project.create({
    data: {
      workspaceId,
      name: input.name,
      niche: input.niche,
      timezone: input.timezone,
    },
  });
}

export async function getProjectForUser(userId: string, projectId: string) {
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
      workspace: true,
      strategy: true,
      socialAccounts: true,
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  return project;
}

export async function listProjectsForUser(userId: string) {
  return db.project.findMany({
    where: {
      workspace: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      workspace: true,
      strategy: true,
    },
  });
}
