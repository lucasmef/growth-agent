import { WorkspaceRole } from "@prisma/client";

import { db } from "@/lib/db";
import { createRandomSuffix, slugify } from "@/lib/slug";

import type { CreateWorkspaceInput } from "./workspace.schemas";

async function generateUniqueWorkspaceSlug(name: string) {
  const baseSlug = slugify(name);
  let candidate = baseSlug || `workspace-${createRandomSuffix()}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await db.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${createRandomSuffix()}`;
  }

  return `workspace-${createRandomSuffix()}`;
}

export async function createWorkspaceForUser(
  userId: string,
  input: CreateWorkspaceInput,
) {
  const slug = await generateUniqueWorkspaceSlug(input.name);

  return db.workspace.create({
    data: {
      name: input.name,
      slug,
      members: {
        create: {
          userId,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });
}

export async function listUserWorkspaces(userId: string) {
  return db.workspace.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      projects: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          strategy: true,
        },
      },
      members: {
        where: { userId },
        select: {
          role: true,
        },
      },
    },
  });
}

export async function assertWorkspaceMembership(
  userId: string,
  workspaceId: string,
) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("Workspace not found or access denied");
  }

  return membership;
}
