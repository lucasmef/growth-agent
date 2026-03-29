import { AgentRunKind, CalendarWeekStatus, ContentPillarStatus, DecisionType } from "@prisma/client";

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

import {
  generatedPillarsSchema,
  generatedWeeklyCalendarSchema,
  type GeneratedPillars,
  type GeneratedWeeklyCalendar,
} from "./planning.schemas";

function uniqueByName<T extends { name: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.name.trim().toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function startOfNextWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;

  result.setDate(result.getDate() + daysUntilMonday);
  result.setHours(9, 0, 0, 0);

  return result;
}

function buildSlotDate(weekStart: Date, dayOffset: number, slotIndex: number) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(9 + slotIndex * 2, 0, 0, 0);

  return date;
}

function buildFallbackPillars(project: Awaited<ReturnType<typeof getProjectForUser>>): GeneratedPillars {
  const niche = project.niche;
  const goal = project.strategy?.primaryGoal ?? "crescer audiência qualificada";

  return {
    pillars: uniqueByName([
      {
        name: "Erros comuns",
        description: `Mostrar erros frequentes no nicho ${niche} e como evitá-los.`,
        priority: 90,
      },
      {
        name: "Frameworks práticos",
        description: `Ensinar frameworks simples que aproximem a audiência do objetivo de ${goal}.`,
        priority: 85,
      },
      {
        name: "Bastidores e processo",
        description: "Compartilhar processo, rotina e aprendizados operacionais do projeto.",
        priority: 70,
      },
      {
        name: "Provas e exemplos",
        description: "Usar exemplos concretos, comparações e mini estudos para reforçar autoridade.",
        priority: 80,
      },
    ]),
  };
}

function buildFallbackCalendar(project: Awaited<ReturnType<typeof getProjectForUser>>): GeneratedWeeklyCalendar {
  const pillars =
    project.pillars.length > 0
      ? project.pillars.map((pillar) => pillar.name)
      : buildFallbackPillars(project).pillars.map((pillar) => pillar.name);

  return {
    rationale:
      "Distribuir formatos curtos e educativos ao longo da semana para combinar alcance, autoridade e repetição de mensagem.",
    slots: [
      {
        dayOffset: 0,
        platform: "INSTAGRAM",
        format: "CAROUSEL",
        pillarName: pillars[0] ?? "Erros comuns",
        objective: "Gerar salvamentos",
        brief: "Abrir com dor clara, listar 5 erros e fechar com CTA para comentar qual deles mais trava o público.",
      },
      {
        dayOffset: 1,
        platform: "TIKTOK",
        format: "TALKING_HEAD",
        pillarName: pillars[1] ?? "Frameworks práticos",
        objective: "Aumentar retenção",
        brief: "Explicar um framework em 3 passos com hook de contraste entre amador e operador.",
      },
      {
        dayOffset: 3,
        platform: "INSTAGRAM",
        format: "REEL",
        pillarName: pillars[2] ?? "Bastidores e processo",
        objective: "Gerar conexão",
        brief: "Mostrar bastidor da execução com narrativa curta e CTA para seguir a série.",
      },
      {
        dayOffset: 5,
        platform: "TIKTOK",
        format: "SHORT_VIDEO",
        pillarName: pillars[3] ?? "Provas e exemplos",
        objective: "Reforçar autoridade",
        brief: "Usar exemplo concreto ou mini estudo com before/after e aprendizagem prática.",
      },
    ],
  };
}

async function generatePillarsWithAi(
  project: Awaited<ReturnType<typeof getProjectForUser>>,
) {
  return generateStructuredObject({
    schema: generatedPillarsSchema,
    model: "gpt-5-mini",
    system:
      "You are a senior social growth strategist. Create practical content pillars with clear strategic separation and no fluff.",
    prompt: `
Project niche: ${project.niche}
Primary goal: ${project.strategy?.primaryGoal ?? "grow the profile"}
Target audience: ${project.strategy?.targetAudience ?? "not provided"}
Tone of voice: ${project.strategy?.toneOfVoice ?? "not provided"}
Editorial rules: ${JSON.stringify(project.strategy?.editorialRules ?? [])}
Banned topics: ${JSON.stringify(project.strategy?.bannedTopics ?? [])}
Banned claims: ${JSON.stringify(project.strategy?.bannedClaims ?? [])}

Return 4 to 5 content pillars for Instagram and TikTok, each with a practical description and priority.
`,
  });
}

async function generateCalendarWithAi(
  project: Awaited<ReturnType<typeof getProjectForUser>>,
) {
  return generateStructuredObject({
    schema: generatedWeeklyCalendarSchema,
    model: "gpt-5-mini",
    system:
      "You are a principal content strategist. Build a lean weekly publishing plan for Instagram and TikTok with good variety and a clear reason for every slot.",
    prompt: `
Project niche: ${project.niche}
Primary goal: ${project.strategy?.primaryGoal ?? "grow the profile"}
Target audience: ${project.strategy?.targetAudience ?? "not provided"}
Tone of voice: ${project.strategy?.toneOfVoice ?? "not provided"}
Available pillars: ${JSON.stringify(project.pillars.map((pillar) => pillar.name))}
Editorial rules: ${JSON.stringify(project.strategy?.editorialRules ?? [])}
Banned topics: ${JSON.stringify(project.strategy?.bannedTopics ?? [])}
Banned claims: ${JSON.stringify(project.strategy?.bannedClaims ?? [])}

Return a one-week content plan with 4 to 6 slots. Spread them across the week, combine Instagram and TikTok, and use the provided pillar names.
`,
  });
}

export async function generatePillarsForProject(userId: string, projectId: string) {
  const project = await getProjectForUser(userId, projectId);

  if (!project.strategy) {
    throw new Error("Project strategy must be configured before generating pillars");
  }

  const agentRun = await createAgentRun({
    projectId,
    kind: AgentRunKind.PILLARS,
    model: isAiConfigured() ? "gpt-5-mini" : "fallback-rule-engine",
    promptVersion: "pillars-v1",
    inputPayload: {
      projectId,
      niche: project.niche,
      strategy: project.strategy,
    },
  });

  try {
    const generation = isAiConfigured()
      ? await generatePillarsWithAi(project)
      : { object: buildFallbackPillars(project), finishReason: "fallback" };

    await logDecision({
      agentRunId: agentRun.id,
      stepKey: "pillar-generation",
      decisionType: DecisionType.PLANNING,
      summary: isAiConfigured()
        ? "Pilares gerados com provider configurado."
        : "Pilares gerados por fallback determinístico por ausência de chave de IA.",
      payload: generation.object,
    });

    const createdPillars = await db.$transaction(async (tx) => {
      await tx.contentPillar.deleteMany({
        where: {
          projectId,
        },
      });

      return Promise.all(
        generation.object.pillars.map((pillar) =>
          tx.contentPillar.create({
            data: {
              projectId,
              name: pillar.name,
              description: pillar.description,
              priority: pillar.priority,
              status: ContentPillarStatus.ACTIVE,
            },
          }),
        ),
      );
    });

    await completeAgentRun({
      agentRunId: agentRun.id,
      outputPayload: {
        pillars: createdPillars.map((pillar) => ({
          id: pillar.id,
          name: pillar.name,
        })),
        finishReason: generation.finishReason,
      },
    });

    return createdPillars;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate pillars";

    await failAgentRun({
      agentRunId: agentRun.id,
      errorMessage: message,
    });

    throw error;
  }
}

export async function generateWeeklyCalendarForProject(
  userId: string,
  projectId: string,
) {
  let project = await getProjectForUser(userId, projectId);

  if (!project.strategy) {
    throw new Error("Project strategy must be configured before generating calendar");
  }

  if (project.pillars.length === 0) {
    await generatePillarsForProject(userId, projectId);
    project = await getProjectForUser(userId, projectId);
  }

  const weekStart = startOfNextWeek();

  const agentRun = await createAgentRun({
    projectId,
    kind: AgentRunKind.CALENDAR,
    model: isAiConfigured() ? "gpt-5-mini" : "fallback-rule-engine",
    promptVersion: "calendar-v1",
    inputPayload: {
      projectId,
      weekStart: weekStart.toISOString(),
      pillars: project.pillars,
      strategy: project.strategy,
    },
  });

  try {
    const generation = isAiConfigured()
      ? await generateCalendarWithAi(project)
      : { object: buildFallbackCalendar(project), finishReason: "fallback" };

    await logDecision({
      agentRunId: agentRun.id,
      stepKey: "calendar-rationale",
      decisionType: DecisionType.PLANNING,
      summary: generation.object.rationale,
      payload: generation.object,
    });

    const calendar = await db.$transaction(async (tx) => {
      const existing = await tx.calendarWeek.findUnique({
        where: {
          projectId_weekStart: {
            projectId,
            weekStart,
          },
        },
        include: {
          slots: true,
        },
      });

      if (existing) {
        await tx.calendarSlot.deleteMany({
          where: {
            calendarWeekId: existing.id,
          },
        });
      }

      const week =
        existing ??
        (await tx.calendarWeek.create({
          data: {
            projectId,
            weekStart,
            status: CalendarWeekStatus.DRAFT,
          },
        }));

      const pillarMap = new Map(
        (
          await tx.contentPillar.findMany({
            where: {
              projectId,
            },
          })
        ).map((pillar) => [pillar.name.toLowerCase(), pillar]),
      );

      const slots = await Promise.all(
        generation.object.slots.map((slot, index) =>
          tx.calendarSlot.create({
            data: {
              calendarWeekId: week.id,
              pillarId: pillarMap.get(slot.pillarName.toLowerCase())?.id,
              platform: slot.platform,
              format: slot.format,
              plannedFor: buildSlotDate(weekStart, slot.dayOffset, index),
              objective: slot.objective,
              brief: slot.brief,
              metadata: {
                source: isAiConfigured() ? "ai" : "fallback",
                pillarName: slot.pillarName,
              },
            },
          }),
        ),
      );

      await tx.calendarWeek.update({
        where: {
          id: week.id,
        },
        data: {
          status: CalendarWeekStatus.READY,
        },
      });

      return {
        weekId: week.id,
        slots,
      };
    });

    await completeAgentRun({
      agentRunId: agentRun.id,
      outputPayload: {
        weekStart: weekStart.toISOString(),
        slotCount: calendar.slots.length,
        finishReason: generation.finishReason,
      },
    });

    return calendar;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate weekly calendar";

    await failAgentRun({
      agentRunId: agentRun.id,
      errorMessage: message,
    });

    throw error;
  }
}
