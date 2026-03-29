import { db } from "@/lib/db";

import type { UpsertStrategyInput } from "./strategy.schemas";

export async function upsertProjectStrategyForUser(
  userId: string,
  projectId: string,
  input: UpsertStrategyInput,
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
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  return db.projectStrategy.upsert({
    where: {
      projectId,
    },
    update: {
      targetAudience: input.targetAudience,
      toneOfVoice: input.toneOfVoice,
      primaryGoal: input.primaryGoal,
      secondaryGoals: input.secondaryGoals,
      offerDescription: input.offerDescription || null,
      editorialRules: input.editorialRules,
      bannedTopics: input.bannedTopics,
      bannedClaims: input.bannedClaims,
    },
    create: {
      projectId,
      targetAudience: input.targetAudience,
      toneOfVoice: input.toneOfVoice,
      primaryGoal: input.primaryGoal,
      secondaryGoals: input.secondaryGoals,
      offerDescription: input.offerDescription || null,
      editorialRules: input.editorialRules,
      bannedTopics: input.bannedTopics,
      bannedClaims: input.bannedClaims,
    },
  });
}
