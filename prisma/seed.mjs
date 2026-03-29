import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfCurrentWeek() {
  const now = new Date();
  const result = new Date(now);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function plusDays(date, days, hour = 9) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(hour, 0, 0, 0);
  return result;
}

async function main() {
  const devEmail = (process.env.DEV_AUTH_EMAIL ?? "local-admin@growth-agent.dev").toLowerCase();
  const devName = process.env.DEV_AUTH_NAME ?? "Local Admin";
  const currentWeekStart = startOfCurrentWeek();

  const user = await prisma.user.upsert({
    where: {
      authProviderId: `dev:${devEmail}`,
    },
    update: {
      email: devEmail,
      name: devName,
      platformRole: "ADMIN",
    },
    create: {
      authProviderId: `dev:${devEmail}`,
      email: devEmail,
      name: devName,
      platformRole: "ADMIN",
    },
  });

  const customerWorkspace = await prisma.workspace.upsert({
    where: {
      slug: "demo-customer-workspace",
    },
    update: {
      name: "Demo Customer Workspace",
      type: "CUSTOMER",
    },
    create: {
      name: "Demo Customer Workspace",
      slug: "demo-customer-workspace",
      type: "CUSTOMER",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: customerWorkspace.id,
        userId: user.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      workspaceId: customerWorkspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  const adminWorkspace = await prisma.workspace.upsert({
    where: {
      slug: "growth-lab-demo",
    },
    update: {
      name: "Growth Lab Demo",
      type: "ADMIN_LAB",
    },
    create: {
      name: "Growth Lab Demo",
      slug: "growth-lab-demo",
      type: "ADMIN_LAB",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: adminWorkspace.id,
        userId: user.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      workspaceId: adminWorkspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  let adminProject = await prisma.project.findFirst({
    where: {
      workspaceId: adminWorkspace.id,
      name: "UGC Hooks Lab",
    },
  });

  if (!adminProject) {
    adminProject = await prisma.project.create({
      data: {
        workspaceId: adminWorkspace.id,
        name: "UGC Hooks Lab",
        niche: "Creator economy",
        timezone: "America/Sao_Paulo",
        mode: "EXPERIMENT",
        approvalMode: "AUTO_APPROVE",
      },
    });
  }

  await prisma.projectStrategy.upsert({
    where: {
      projectId: adminProject.id,
    },
    update: {
      targetAudience: "Creators iniciantes e freelancers de social media",
      toneOfVoice: "Direto, leve e pratico",
      primaryGoal: "Descobrir hooks e cadencia com maior tracao inicial",
      secondaryGoals: ["Testar formatos curtos", "Aumentar retencao", "Gerar insights reaproveitaveis"],
      offerDescription: "Laboratorio interno para validar padroes vencedores",
      editorialRules: ["Abrir com hook de 2 segundos", "Ir para um exemplo real", "Fechar com CTA objetivo"],
      bannedTopics: ["Promessas sem prova"],
      bannedClaims: ["Garantia de viralizacao", "Resultado absoluto"],
    },
    create: {
      projectId: adminProject.id,
      targetAudience: "Creators iniciantes e freelancers de social media",
      toneOfVoice: "Direto, leve e pratico",
      primaryGoal: "Descobrir hooks e cadencia com maior tracao inicial",
      secondaryGoals: ["Testar formatos curtos", "Aumentar retencao", "Gerar insights reaproveitaveis"],
      offerDescription: "Laboratorio interno para validar padroes vencedores",
      editorialRules: ["Abrir com hook de 2 segundos", "Ir para um exemplo real", "Fechar com CTA objetivo"],
      bannedTopics: ["Promessas sem prova"],
      bannedClaims: ["Garantia de viralizacao", "Resultado absoluto"],
    },
  });

  await prisma.socialAccount.upsert({
    where: {
      projectId_platform_username: {
        projectId: adminProject.id,
        platform: "INSTAGRAM",
        username: "growthlab.ig",
      },
    },
    update: {
      status: "CONNECTED",
      bundleSocialAccountId: "demo-admin-instagram",
      externalAccountId: "demo-admin-instagram",
      connectedAt: new Date(),
    },
    create: {
      projectId: adminProject.id,
      platform: "INSTAGRAM",
      username: "growthlab.ig",
      status: "CONNECTED",
      bundleSocialAccountId: "demo-admin-instagram",
      externalAccountId: "demo-admin-instagram",
      connectedAt: new Date(),
    },
  });

  const adminPillars = [
    {
      name: "Hook Library",
      description: "Ganchos curtos para creator economy",
      priority: 90,
    },
    {
      name: "Breakdowns",
      description: "Analise rapida de posts que performaram",
      priority: 70,
    },
  ];

  for (const pillar of adminPillars) {
    const existing = await prisma.contentPillar.findFirst({
      where: {
        projectId: adminProject.id,
        name: pillar.name,
      },
    });

    if (!existing) {
      await prisma.contentPillar.create({
        data: {
          projectId: adminProject.id,
          name: pillar.name,
          description: pillar.description,
          priority: pillar.priority,
        },
      });
    }
  }

  const adminExperiment = await prisma.experimentRun.findFirst({
    where: {
      projectId: adminProject.id,
      hypothesis: "Hooks curtos com numeros geram maior retencao inicial",
    },
  });

  const experimentRun =
    adminExperiment ??
    (await prisma.experimentRun.create({
      data: {
        projectId: adminProject.id,
        status: "PROMOTED",
        hypothesis: "Hooks curtos com numeros geram maior retencao inicial",
        objective: "Descobrir um padrao de abertura reaproveitavel para clientes",
        startedAt: plusDays(currentWeekStart, -21, 10),
        finishedAt: plusDays(currentWeekStart, -7, 18),
        promotedAt: plusDays(currentWeekStart, -6, 11),
        summary: "Hooks numericos com quebra de expectativa performaram melhor.",
        baselineMetrics: {
          publishedItemsCount: 0,
          analytics: {
            views: 0,
            followers: 0,
            engagementRate: 0,
          },
        },
        resultMetrics: {
          publishedItemsCount: 6,
          scheduledItemsCount: 8,
          analytics: {
            impressions: 18400,
            views: 11250,
            followers: 420,
            engagementRate: 0.073,
          },
        },
        notes: ["top formato: talking head curto", "cta vencedor: pergunta final"],
      },
    }));

  const promotedProfile = await prisma.publicationProfile.upsert({
    where: {
      slug: "ugc-hook-engine",
    },
    update: {
      createdByUserId: user.id,
      sourceProjectId: adminProject.id,
      name: "UGC Hook Engine",
      description: "Padrao para contas que precisam crescer com hooks curtos e práticos.",
      status: "ACTIVE",
      platformScope: ["INSTAGRAM", "TIKTOK"],
      strategyPreset: {
        targetAudience: "Creators iniciantes e freelancers de social media",
        toneOfVoice: "Direto, leve e pratico",
        primaryGoal: "Crescer alcance e retencao nos primeiros segundos",
        secondaryGoals: ["Aumentar salvamentos", "Gerar comentarios"],
      },
      planningPreset: {
        pillars: adminPillars,
      },
      publishingPreset: {
        recommendedPlatforms: ["INSTAGRAM", "TIKTOK"],
        cadence: "5 posts por semana",
        defaultApprovalMode: "MANUAL_REQUIRED",
      },
      guardrails: {
        editorialRules: ["Abrir com contraste", "Ser concreto", "Fechar com CTA curto"],
        bannedClaims: ["Garantia de viralizacao", "Promessa absoluta"],
      },
      successCriteria: {
        resultMetrics: {
          impressions: 18400,
          views: 11250,
          followers: 420,
          engagementRate: 0.073,
        },
      },
    },
    create: {
      createdByUserId: user.id,
      sourceProjectId: adminProject.id,
      name: "UGC Hook Engine",
      slug: "ugc-hook-engine",
      description: "Padrao para contas que precisam crescer com hooks curtos e práticos.",
      status: "ACTIVE",
      platformScope: ["INSTAGRAM", "TIKTOK"],
      strategyPreset: {
        targetAudience: "Creators iniciantes e freelancers de social media",
        toneOfVoice: "Direto, leve e pratico",
        primaryGoal: "Crescer alcance e retencao nos primeiros segundos",
        secondaryGoals: ["Aumentar salvamentos", "Gerar comentarios"],
      },
      planningPreset: {
        pillars: adminPillars,
      },
      publishingPreset: {
        recommendedPlatforms: ["INSTAGRAM", "TIKTOK"],
        cadence: "5 posts por semana",
        defaultApprovalMode: "MANUAL_REQUIRED",
      },
      guardrails: {
        editorialRules: ["Abrir com contraste", "Ser concreto", "Fechar com CTA curto"],
        bannedClaims: ["Garantia de viralizacao", "Promessa absoluta"],
      },
      successCriteria: {
        resultMetrics: {
          impressions: 18400,
          views: 11250,
          followers: 420,
          engagementRate: 0.073,
        },
      },
    },
  });

  await prisma.experimentRun.update({
    where: {
      id: experimentRun.id,
    },
    data: {
      status: "PROMOTED",
      publicationProfileId: promotedProfile.id,
      promotedAt: plusDays(currentWeekStart, -6, 11),
    },
  });

  let customerProject = await prisma.project.findFirst({
    where: {
      workspaceId: customerWorkspace.id,
      name: "Acme Creator Studio",
    },
  });

  if (!customerProject) {
    customerProject = await prisma.project.create({
      data: {
        workspaceId: customerWorkspace.id,
        name: "Acme Creator Studio",
        niche: "Marketing para creators",
        timezone: "America/Sao_Paulo",
        mode: "CLIENT_MANAGED",
        approvalMode: "MANUAL_REQUIRED",
        publicationProfileId: promotedProfile.id,
      },
    });
  } else if (customerProject.publicationProfileId !== promotedProfile.id) {
    customerProject = await prisma.project.update({
      where: {
        id: customerProject.id,
      },
      data: {
        publicationProfileId: promotedProfile.id,
      },
    });
  }

  await prisma.projectStrategy.upsert({
    where: {
      projectId: customerProject.id,
    },
    update: {
      targetAudience: "Creators pequenos e infoprodutores no inicio do funil",
      toneOfVoice: "Objetivo, confiante e acessivel",
      primaryGoal: "Crescer alcance e gerar demanda organica",
      secondaryGoals: ["Aumentar seguidores", "Gerar leads qualificados"],
      offerDescription: "Consultoria e operacao de conteudo para creators",
      editorialRules: ["Sempre abrir com dor concreta", "Trazer exemplo real", "Fechar com CTA simples"],
      bannedTopics: ["Promessas milagrosas"],
      bannedClaims: ["Resultado garantido", "Ganhos irreais"],
    },
    create: {
      projectId: customerProject.id,
      targetAudience: "Creators pequenos e infoprodutores no inicio do funil",
      toneOfVoice: "Objetivo, confiante e acessivel",
      primaryGoal: "Crescer alcance e gerar demanda organica",
      secondaryGoals: ["Aumentar seguidores", "Gerar leads qualificados"],
      offerDescription: "Consultoria e operacao de conteudo para creators",
      editorialRules: ["Sempre abrir com dor concreta", "Trazer exemplo real", "Fechar com CTA simples"],
      bannedTopics: ["Promessas milagrosas"],
      bannedClaims: ["Resultado garantido", "Ganhos irreais"],
    },
  });

  const customerInstagramAccount = await prisma.socialAccount.upsert({
    where: {
      projectId_platform_username: {
        projectId: customerProject.id,
        platform: "INSTAGRAM",
        username: "acmecreatorstudio",
      },
    },
    update: {
      status: "CONNECTED",
      bundleSocialAccountId: "demo-customer-instagram",
      externalAccountId: "demo-customer-instagram",
      connectedAt: new Date(),
    },
    create: {
      projectId: customerProject.id,
      platform: "INSTAGRAM",
      username: "acmecreatorstudio",
      status: "CONNECTED",
      bundleSocialAccountId: "demo-customer-instagram",
      externalAccountId: "demo-customer-instagram",
      connectedAt: new Date(),
    },
  });

  const customerPillars = [
    {
      name: "Growth Mistakes",
      description: "Erros comuns que travam contas pequenas",
      priority: 90,
    },
    {
      name: "Frameworks",
      description: "Modelos de hook, CTA e estrutura de roteiro",
      priority: 80,
    },
  ];

  const createdCustomerPillars = [];

  for (const pillar of customerPillars) {
    let existing = await prisma.contentPillar.findFirst({
      where: {
        projectId: customerProject.id,
        name: pillar.name,
      },
    });

    if (!existing) {
      existing = await prisma.contentPillar.create({
        data: {
          projectId: customerProject.id,
          name: pillar.name,
          description: pillar.description,
          priority: pillar.priority,
        },
      });
    }

    createdCustomerPillars.push(existing);
  }

  const calendarWeek = await prisma.calendarWeek.upsert({
    where: {
      projectId_weekStart: {
        projectId: customerProject.id,
        weekStart: currentWeekStart,
      },
    },
    update: {
      status: "READY",
    },
    create: {
      projectId: customerProject.id,
      weekStart: currentWeekStart,
      status: "READY",
      generatedFromAnalyticsAt: new Date(),
    },
  });

  const slot = await prisma.calendarSlot.upsert({
    where: {
      id: `seed-slot-${customerProject.id}`,
    },
    update: {
      objective: "Mostrar o erro que mais trava contas pequenas",
      brief: "Talking head de 30 segundos com hook numerico e CTA para comentario",
    },
    create: {
      id: `seed-slot-${customerProject.id}`,
      calendarWeekId: calendarWeek.id,
      pillarId: createdCustomerPillars[0]?.id ?? null,
      platform: "INSTAGRAM",
      format: "TALKING_HEAD",
      plannedFor: plusDays(currentWeekStart, 2, 10),
      objective: "Mostrar o erro que mais trava contas pequenas",
      brief: "Talking head de 30 segundos com hook numerico e CTA para comentario",
    },
  });

  let contentItem = await prisma.contentItem.findFirst({
    where: {
      projectId: customerProject.id,
      title: "3 erros que deixam seu Instagram invisivel",
    },
  });

  if (!contentItem) {
    contentItem = await prisma.contentItem.create({
      data: {
        projectId: customerProject.id,
        calendarSlotId: slot.id,
        title: "3 erros que deixam seu Instagram invisivel",
        platform: "INSTAGRAM",
        format: "TALKING_HEAD",
        status: "PUBLISHED",
        scheduledFor: plusDays(currentWeekStart, 2, 10),
        approvedAt: plusDays(currentWeekStart, 1, 16),
        publishedAt: plusDays(currentWeekStart, 2, 10),
      },
    });
  }

  await prisma.contentVersion.upsert({
    where: {
      contentItemId_versionNumber: {
        contentItemId: contentItem.id,
        versionNumber: 1,
      },
    },
    update: {
      hook: "Se o seu Instagram nao cresce, provavelmente voce comete um destes 3 erros.",
      script:
        "Erro 1: comecar pelo contexto. Erro 2: nao mostrar um exemplo real. Erro 3: terminar sem CTA. Fecha perguntando qual deles esta travando o perfil.",
      caption:
        "Quer mais alcance sem depender de sorte? Corrija estes 3 erros antes do proximo post.",
      cta: "Comenta ERRO que eu te mando um checklist.",
      hashtags: ["#instagramgrowth", "#creatorstrategy", "#socialmedia"],
      assetBrief: "Video vertical 9:16 com creator falando para camera",
      model: "seed",
      promptVersion: "seed-v1",
    },
    create: {
      contentItemId: contentItem.id,
      versionNumber: 1,
      hook: "Se o seu Instagram nao cresce, provavelmente voce comete um destes 3 erros.",
      script:
        "Erro 1: comecar pelo contexto. Erro 2: nao mostrar um exemplo real. Erro 3: terminar sem CTA. Fecha perguntando qual deles esta travando o perfil.",
      caption:
        "Quer mais alcance sem depender de sorte? Corrija estes 3 erros antes do proximo post.",
      cta: "Comenta ERRO que eu te mando um checklist.",
      hashtags: ["#instagramgrowth", "#creatorstrategy", "#socialmedia"],
      assetBrief: "Video vertical 9:16 com creator falando para camera",
      model: "seed",
      promptVersion: "seed-v1",
    },
  });

  const existingApproval = await prisma.approval.findFirst({
    where: {
      contentItemId: contentItem.id,
      reviewerId: user.id,
    },
  });

  if (!existingApproval) {
    await prisma.approval.create({
      data: {
        contentItemId: contentItem.id,
        reviewerId: user.id,
        status: "APPROVED",
        notes: "Seed approval",
        actedAt: plusDays(currentWeekStart, 1, 16),
      },
    });
  }

  const existingAsset = await prisma.asset.findFirst({
    where: {
      projectId: customerProject.id,
      contentItemId: contentItem.id,
      bundleUploadId: "seed-upload-001",
    },
  });

  if (!existingAsset) {
    await prisma.asset.create({
      data: {
        projectId: customerProject.id,
        contentItemId: contentItem.id,
        type: "VIDEO",
        source: "seed",
        bundleUploadId: "seed-upload-001",
        url: "https://example.com/assets/seed-upload-001.mp4",
        mimeType: "video/mp4",
      },
    });
  }

  const existingPublication = await prisma.publication.findFirst({
    where: {
      contentItemId: contentItem.id,
    },
  });

  if (!existingPublication) {
    await prisma.publication.create({
      data: {
        contentItemId: contentItem.id,
        bundlePostId: "seed-post-001",
        status: "PUBLISHED",
        scheduledFor: plusDays(currentWeekStart, 2, 10),
        publishedAt: plusDays(currentWeekStart, 2, 10),
      },
    });
  }

  const projectSnapshot = await prisma.analyticsSnapshot.findFirst({
    where: {
      projectId: customerProject.id,
      scope: "PROJECT",
    },
  });

  if (!projectSnapshot) {
    await prisma.analyticsSnapshot.createMany({
      data: [
        {
          projectId: customerProject.id,
          scope: "CONTENT_ITEM",
          contentItemId: contentItem.id,
          snapshotDate: plusDays(currentWeekStart, 4, 12),
          metrics: {
            impressions: 8400,
            views: 5200,
            likes: 290,
            comments: 42,
            shares: 19,
            saves: 37,
            interactions: 388,
            engagementRate: 0.0462,
          },
        },
        {
          projectId: customerProject.id,
          scope: "SOCIAL_ACCOUNT",
          socialAccountId: customerInstagramAccount.id,
          snapshotDate: plusDays(currentWeekStart, 4, 12),
          metrics: {
            impressions: 12000,
            views: 7300,
            followers: 610,
            likes: 410,
            comments: 56,
            postCount: 14,
          },
        },
        {
          projectId: customerProject.id,
          scope: "PROJECT",
          snapshotDate: plusDays(currentWeekStart, 4, 12),
          metrics: {
            impressions: 8400,
            views: 5200,
            followers: 610,
            engagementRate: 0.0462,
            syncedContentItems: 1,
            syncedSocialAccounts: 1,
          },
        },
      ],
    });
  }

  const existingAgentRun = await prisma.agentRun.findFirst({
    where: {
      projectId: customerProject.id,
      kind: "DRAFT",
    },
  });

  if (!existingAgentRun) {
    const agentRun = await prisma.agentRun.create({
      data: {
        projectId: customerProject.id,
        kind: "DRAFT",
        status: "SUCCEEDED",
        model: "seed",
        promptVersion: "seed-v1",
        startedAt: plusDays(currentWeekStart, 1, 10),
        finishedAt: plusDays(currentWeekStart, 1, 10),
        inputPayload: {
          source: "seed",
          profile: promotedProfile.name,
        },
        outputPayload: {
          contentItemId: contentItem.id,
        },
      },
    });

    await prisma.decisionLog.createMany({
      data: [
        {
          agentRunId: agentRun.id,
          stepKey: "brief",
          decisionType: "INPUT_SUMMARY",
          summary: "Usou objetivo do slot e publication profile selecionado.",
        },
        {
          agentRunId: agentRun.id,
          stepKey: "hook-selection",
          decisionType: "CONTENT_SELECTION",
          summary: "Escolheu hook numerico com contraste para maximizar retencao.",
        },
      ],
    });
  }

  console.log("Seed concluido com sucesso.");
  console.log(`Dev user: ${devEmail}`);
  console.log(`Customer project: ${customerProject.name}`);
  console.log(`Admin lab project: ${adminProject.name}`);
  console.log(`Publication profile: ${promotedProfile.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
