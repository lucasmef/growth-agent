import {
  AgentRunKind,
  ApprovalStatus,
  ContentItemStatus,
  DecisionType,
} from "@prisma/client";

import { generateStructuredObject } from "@/integrations/ai/ai-gateway";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/env";
import {
  completeAgentRun,
  createAgentRun,
  failAgentRun,
  logDecision,
} from "@/modules/agent-ops/application/agent-run.service";
import { getProjectForUser } from "@/modules/project/application/project.service";

import { generatedDraftSchema, type GeneratedDraft } from "./content.schemas";

type ProjectWithRelations = Awaited<ReturnType<typeof getProjectForUser>>;

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildFallbackDraft(
  project: ProjectWithRelations,
  slot: ProjectWithRelations["calendarWeeks"][number]["slots"][number],
): GeneratedDraft {
  const pillarName = slot.pillar?.name ?? "conteúdo estratégico";
  const niche = project.niche;
  const tone = project.strategy?.toneOfVoice ?? "claro e direto";
  const goal = project.strategy?.primaryGoal ?? "crescer a audiência";

  return {
    title: `${pillarName}: ${slot.objective}`,
    hook: `Se você atua em ${niche}, este é o erro que mais atrasa ${goal.toLowerCase()}.`,
    script: [
      `Hook: ${slot.objective}.`,
      `Contexto: em ${niche}, muita gente tenta crescer sem um processo claro.`,
      `Ponto 1: explique por que isso acontece no dia a dia do público.`,
      `Ponto 2: mostre o ajuste prático com linguagem ${tone}.`,
      `Ponto 3: conecte a mudança ao resultado desejado.`,
      `Fechamento: convide a audiência a aplicar hoje e voltar com feedback.`,
    ].join("\n"),
    caption: `${slot.brief}\n\nResumo prático: foque no básico executado com consistência antes de buscar volume.\n\nCTA: comente "roteiro" se quiser que eu transforme isso em uma série.`,
    cta: "Comente qual parte você quer ver aprofundada na próxima publicação.",
    hashtags: [
      "#growth",
      "#socialmedia",
      "#instagramgrowth",
      "#tiktokgrowth",
      `#${pillarName.replace(/\s+/g, "").toLowerCase()}`,
    ],
    assetBrief:
      "Vídeo curto em talking head ou b-roll com texto na tela reforçando os 3 pontos principais e fechamento em CTA.",
  };
}

async function generateDraftWithAi(
  project: ProjectWithRelations,
  slot: ProjectWithRelations["calendarWeeks"][number]["slots"][number],
) {
  const recentPosts = project.contentItems
    .flatMap((item) =>
      item.versions.map((version) => ({
        title: item.title ?? undefined,
        caption: version.caption,
        platform: item.platform,
      })),
    )
    .slice(0, 6);

  return generateStructuredObject({
    schema: generatedDraftSchema,
    model: "gpt-5-mini",
    system:
      "You are a senior short-form content strategist. Generate practical social drafts with strong hooks, clear structure, safe claims, and no fluff.",
    prompt: `
Project niche: ${project.niche}
Primary goal: ${project.strategy?.primaryGoal ?? "grow audience"}
Target audience: ${project.strategy?.targetAudience ?? "not provided"}
Tone of voice: ${project.strategy?.toneOfVoice ?? "not provided"}
Editorial rules: ${JSON.stringify(readStringList(project.strategy?.editorialRules))}
Banned topics: ${JSON.stringify(readStringList(project.strategy?.bannedTopics))}
Banned claims: ${JSON.stringify(readStringList(project.strategy?.bannedClaims))}
Platform: ${slot.platform}
Format: ${slot.format}
Pillar: ${slot.pillar?.name ?? "not provided"}
Objective: ${slot.objective}
Brief: ${slot.brief}
Recent posts: ${JSON.stringify(recentPosts)}

Return one complete draft with title, hook, script, caption, CTA, hashtags and asset brief.
Avoid repeating recent angles.
`,
  });
}

async function getProjectAndSlot(userId: string, projectId: string, slotId: string) {
  const project = await getProjectForUser(userId, projectId);
  const slot =
    project.calendarWeeks.flatMap((week) => week.slots).find((item) => item.id === slotId) ??
    null;

  if (!slot) {
    throw new Error("Calendar slot not found");
  }

  if (!project.strategy) {
    throw new Error("Project strategy must be configured before generating drafts");
  }

  return {
    project,
    slot,
  };
}

async function ensureContentItemForSlot(
  projectId: string,
  slot: ProjectWithRelations["calendarWeeks"][number]["slots"][number],
) {
  const existing = await db.contentItem.findFirst({
    where: {
      projectId,
      calendarSlotId: slot.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return existing;
  }

  return db.contentItem.create({
    data: {
      projectId,
      calendarSlotId: slot.id,
      platform: slot.platform,
      format: slot.format,
      status: ContentItemStatus.PLANNED,
      scheduledFor: slot.plannedFor,
      title: slot.objective,
    },
  });
}

export async function generateDraftForCalendarSlot(
  userId: string,
  projectId: string,
  slotId: string,
) {
  const { project, slot } = await getProjectAndSlot(userId, projectId, slotId);

  const contentItem = await ensureContentItemForSlot(projectId, slot);
  const nextVersionNumber = await db.contentVersion.count({
    where: {
      contentItemId: contentItem.id,
    },
  });

  const agentRun = await createAgentRun({
    projectId,
    kind: AgentRunKind.DRAFT,
    model: isAiConfigured() ? "gpt-5-mini" : "fallback-rule-engine",
    promptVersion: "draft-v1",
    inputPayload: {
      projectId,
      contentItemId: contentItem.id,
      slot,
      strategy: project.strategy,
    },
  });

  await db.contentItem.update({
    where: { id: contentItem.id },
    data: {
      status: ContentItemStatus.DRAFTING,
    },
  });

  try {
    const generation = isAiConfigured()
      ? await generateDraftWithAi(project, slot)
      : { object: buildFallbackDraft(project, slot), finishReason: "fallback" };

    const version = await db.contentVersion.create({
      data: {
        contentItemId: contentItem.id,
        versionNumber: nextVersionNumber + 1,
        hook: generation.object.hook,
        script: generation.object.script,
        caption: generation.object.caption,
        cta: generation.object.cta,
        hashtags: generation.object.hashtags,
        assetBrief: generation.object.assetBrief,
        generationMeta: {
          finishReason: generation.finishReason,
          source: isAiConfigured() ? "ai" : "fallback",
          slotId,
        },
        model: isAiConfigured() ? "gpt-5-mini" : "fallback-rule-engine",
        promptVersion: "draft-v1",
      },
    });

    await db.contentItem.update({
      where: { id: contentItem.id },
      data: {
        title: generation.object.title,
        status: ContentItemStatus.DRAFT_READY,
      },
    });

    await logDecision({
      agentRunId: agentRun.id,
      stepKey: "draft-generation",
      decisionType: DecisionType.CONTENT_SELECTION,
      summary: generation.object.hook,
      payload: generation.object,
    });

    await logDecision({
      agentRunId: agentRun.id,
      stepKey: "policy-check",
      decisionType: DecisionType.POLICY_CHECK,
      summary: "Draft generated under editorial rules and banned claims constraints.",
      payload: {
        bannedTopics: readStringList(project.strategy?.bannedTopics),
        bannedClaims: readStringList(project.strategy?.bannedClaims),
      },
    });

    await completeAgentRun({
      agentRunId: agentRun.id,
      outputPayload: {
        contentItemId: contentItem.id,
        contentVersionId: version.id,
        finishReason: generation.finishReason,
      },
    });

    return {
      contentItemId: contentItem.id,
      versionId: version.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate draft";

    await db.contentItem.update({
      where: { id: contentItem.id },
      data: {
        status: ContentItemStatus.PLANNED,
      },
    });

    await failAgentRun({
      agentRunId: agentRun.id,
      errorMessage: message,
    });

    throw error;
  }
}

async function getContentItemForUser(userId: string, contentItemId: string) {
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
  });

  if (!contentItem) {
    throw new Error("Content item not found or access denied");
  }

  return contentItem;
}

export async function approveContentForUser(
  userId: string,
  contentItemId: string,
  notes?: string,
) {
  const contentItem = await getContentItemForUser(userId, contentItemId);

  if (
    contentItem.status !== ContentItemStatus.DRAFT_READY &&
    contentItem.status !== ContentItemStatus.CHANGES_REQUESTED
  ) {
    throw new Error("Only draft-ready content can be approved");
  }

  await db.$transaction([
    db.approval.create({
      data: {
        contentItemId,
        reviewerId: userId,
        status: ApprovalStatus.APPROVED,
        notes,
        actedAt: new Date(),
      },
    }),
    db.contentItem.update({
      where: { id: contentItemId },
      data: {
        status: ContentItemStatus.APPROVED,
        approvedAt: new Date(),
      },
    }),
  ]);
}

export async function requestContentChangesForUser(
  userId: string,
  contentItemId: string,
  notes?: string,
) {
  const contentItem = await getContentItemForUser(userId, contentItemId);

  if (
    contentItem.status !== ContentItemStatus.DRAFT_READY &&
    contentItem.status !== ContentItemStatus.APPROVED
  ) {
    throw new Error("Only draft-ready or approved content can request changes");
  }

  await db.$transaction([
    db.approval.create({
      data: {
        contentItemId,
        reviewerId: userId,
        status: ApprovalStatus.CHANGES_REQUESTED,
        notes,
        actedAt: new Date(),
      },
    }),
    db.contentItem.update({
      where: { id: contentItemId },
      data: {
        status: ContentItemStatus.CHANGES_REQUESTED,
        approvedAt: null,
      },
    }),
  ]);
}
