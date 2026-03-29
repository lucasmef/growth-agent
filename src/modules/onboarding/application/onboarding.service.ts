import { db } from "@/lib/db";
import { createRandomSuffix, slugify } from "@/lib/slug";

import type { CreateProjectInput } from "@/modules/project/application/project.schemas";
import type { UpsertStrategyInput } from "@/modules/strategy/application/strategy.schemas";
import type { CreateWorkspaceInput } from "@/modules/workspace/application/workspace.schemas";

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

type CompleteInitialOnboardingInput = {
  workspace: CreateWorkspaceInput;
  project: CreateProjectInput;
  strategy: UpsertStrategyInput;
};

export async function completeInitialOnboarding(
  userId: string,
  input: CompleteInitialOnboardingInput,
) {
  const slug = await generateUniqueWorkspaceSlug(input.workspace.name);

  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: input.workspace.name,
        slug,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    const project = await tx.project.create({
      data: {
        workspaceId: workspace.id,
        name: input.project.name,
        niche: input.project.niche,
        timezone: input.project.timezone,
      },
    });

    await tx.projectStrategy.create({
      data: {
        projectId: project.id,
        targetAudience: input.strategy.targetAudience,
        toneOfVoice: input.strategy.toneOfVoice,
        primaryGoal: input.strategy.primaryGoal,
        secondaryGoals: input.strategy.secondaryGoals,
        offerDescription: input.strategy.offerDescription || null,
        editorialRules: input.strategy.editorialRules,
        bannedTopics: input.strategy.bannedTopics,
        bannedClaims: input.strategy.bannedClaims,
      },
    });

    return {
      workspaceId: workspace.id,
      projectId: project.id,
    };
  });
}
