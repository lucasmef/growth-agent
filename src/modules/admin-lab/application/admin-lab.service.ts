import {
  ApprovalMode,
  ExperimentRunStatus,
  ProjectMode,
  WorkspaceRole,
  WorkspaceType,
} from "@prisma/client";

import { db } from "@/lib/db";
import { createRandomSuffix, slugify } from "@/lib/slug";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

import { computeExperimentMetrics, enqueueAutonomousExperimentCycle } from "./experiment-runtime.service";
import type {
  CreateAdminLabWorkspaceInput,
  CreateExperimentProjectInput,
  StartExperimentRunInput,
  StopExperimentRunInput,
} from "./admin-lab.schemas";

async function generateUniqueWorkspaceSlug(name: string) {
  const baseSlug = slugify(name);
  let candidate = baseSlug || `admin-lab-${createRandomSuffix()}`;

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

  return `admin-lab-${createRandomSuffix()}`;
}

async function getAdminLabWorkspaceForUser(userId: string, workspaceId: string) {
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      type: WorkspaceType.ADMIN_LAB,
      members: {
        some: {
          userId,
        },
      },
    },
  });

  if (!workspace) {
    throw new Error("Admin lab workspace not found or access denied");
  }

  return workspace;
}

async function getExperimentProjectForAdmin(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      mode: ProjectMode.EXPERIMENT,
      workspace: {
        type: WorkspaceType.ADMIN_LAB,
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      experimentRuns: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Experiment project not found or access denied");
  }

  return project;
}

export async function listAdminLabWorkspacesForUser(userId: string) {
  await requirePlatformAdmin();

  return db.workspace.findMany({
    where: {
      type: WorkspaceType.ADMIN_LAB,
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
      members: {
        where: {
          userId,
        },
        select: {
          role: true,
        },
      },
      projects: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          experimentRuns: {
            orderBy: {
              createdAt: "desc",
            },
            take: 3,
          },
          strategy: true,
        },
      },
    },
  });
}

export async function createAdminLabWorkspaceForUser(
  userId: string,
  input: CreateAdminLabWorkspaceInput,
) {
  await requirePlatformAdmin();
  const slug = await generateUniqueWorkspaceSlug(input.name);

  return db.workspace.create({
    data: {
      name: input.name,
      slug,
      type: WorkspaceType.ADMIN_LAB,
      members: {
        create: {
          userId,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });
}

export async function createExperimentProjectForWorkspace(
  userId: string,
  workspaceId: string,
  input: CreateExperimentProjectInput,
) {
  await requirePlatformAdmin();
  await getAdminLabWorkspaceForUser(userId, workspaceId);

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        workspaceId,
        name: input.name,
        niche: input.niche,
        timezone: input.timezone,
        mode: ProjectMode.EXPERIMENT,
        approvalMode: ApprovalMode.AUTO_APPROVE,
      },
    });

    await tx.projectStrategy.create({
      data: {
        projectId: project.id,
        targetAudience: `Audiencia de teste para ${input.niche}`,
        toneOfVoice: "Direto, claro e iterativo",
        primaryGoal: "Descobrir padroes de conteudo com melhor tracao inicial",
        secondaryGoals: [
          "Validar hooks",
          "Testar formatos",
          "Identificar cadencia vencedora",
        ],
        offerDescription:
          "Projeto de experimento interno para validar padroes operacionais.",
        editorialRules: [
          "Comecar com hook forte",
          "Ser especifico",
          "Fechar com CTA curto",
        ],
        bannedTopics: ["Claims sem validacao"],
        bannedClaims: ["Garantia de resultado", "Promessa absoluta"],
      },
    });

    return project;
  });
}

export async function startExperimentRunForProject(
  userId: string,
  projectId: string,
  input: StartExperimentRunInput,
) {
  await requirePlatformAdmin();
  const project = await getExperimentProjectForAdmin(userId, projectId);
  const activeRun = project.experimentRuns.find(
    (run) => run.status === ExperimentRunStatus.RUNNING,
  );

  if (activeRun) {
    return activeRun;
  }

  return db.experimentRun.create({
    data: {
      projectId: project.id,
      publicationProfileId: project.publicationProfileId,
      status: ExperimentRunStatus.RUNNING,
      hypothesis: input.hypothesis ?? null,
      objective: input.objective ?? null,
      baselineMetrics: await computeExperimentMetrics(project.id),
      startedAt: new Date(),
    },
  });
}

export async function stopExperimentRunForProject(
  userId: string,
  projectId: string,
  input: StopExperimentRunInput,
) {
  await requirePlatformAdmin();
  const project = await getExperimentProjectForAdmin(userId, projectId);
  const activeRun = project.experimentRuns.find(
    (run) => run.status === ExperimentRunStatus.RUNNING,
  );

  if (!activeRun) {
    throw new Error("No running experiment found for this project");
  }

  return db.experimentRun.update({
    where: {
      id: activeRun.id,
    },
    data: {
      status: ExperimentRunStatus.STOPPED,
      summary: input.summary ?? null,
      resultMetrics: await computeExperimentMetrics(project.id),
      finishedAt: new Date(),
    },
  });
}

export async function triggerAutonomousCycleForProject(
  userId: string,
  projectId: string,
) {
  await requirePlatformAdmin();
  await getExperimentProjectForAdmin(userId, projectId);

  return enqueueAutonomousExperimentCycle(projectId);
}
