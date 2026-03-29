import {
  AnalyticsScope,
  Platform,
  PublicationProfileStatus,
} from "@prisma/client";

import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";

type JsonRecord = Record<string, unknown>;

type ProfileRanking = {
  profileId: string;
  name: string;
  slug: string;
  status: PublicationProfileStatus;
  description: string | null;
  score: number;
  scoreLabel: string;
  readinessScore: number;
  experimentScore: number;
  adoptionScore: number;
  recencyScore: number;
  assignedProjectsCount: number;
  recommendedPlatforms: Platform[];
  keySignals: string[];
  sourceProjectName: string | null;
  latestExperimentStatus: string | null;
};

type ProfileRecommendation = ProfileRanking & {
  recommendationScore: number;
  fitScore: number;
  isCurrentProfile: boolean;
  reasons: string[];
};

function readJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function readNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readPlatformArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Platform =>
          item === Platform.INSTAGRAM || item === Platform.TIKTOK,
      )
    : [];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreToLabel(score: number) {
  if (score >= 80) {
    return "leader";
  }

  if (score >= 65) {
    return "strong";
  }

  if (score >= 45) {
    return "promising";
  }

  return "early";
}

function keywordSet(input: string | null) {
  if (!input) {
    return new Set<string>();
  }

  return new Set(
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4),
  );
}

function countOverlap(left: Set<string>, right: Set<string>) {
  let matches = 0;

  for (const item of left) {
    if (right.has(item)) {
      matches += 1;
    }
  }

  return matches;
}

function daysSince(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function buildReadinessScore(profile: {
  strategyPreset: unknown;
  planningPreset: unknown;
  publishingPreset: unknown;
  guardrails: unknown;
}) {
  const planningPreset = readJsonRecord(profile.planningPreset);
  const pillars = readStringArray(planningPreset?.pillars);

  let score = 0;

  if (readJsonRecord(profile.strategyPreset)) {
    score += 5;
  }

  if (readJsonRecord(profile.planningPreset)) {
    score += 5;
  }

  if (pillars.length > 0 || Array.isArray(planningPreset?.pillars)) {
    score += 5;
  }

  if (readJsonRecord(profile.publishingPreset)) {
    score += 3;
  }

  if (readJsonRecord(profile.guardrails)) {
    score += 2;
  }

  return score;
}

function buildExperimentScore(resultMetrics: unknown) {
  const record = readJsonRecord(resultMetrics);
  const analytics = readJsonRecord(record?.analytics);
  const views = readNumber(analytics?.views);
  const impressions = readNumber(analytics?.impressions);
  const followers = readNumber(analytics?.followers);
  const engagementRate = readNumber(analytics?.engagementRate);
  const publishedItems = readNumber(record?.publishedItemsCount);
  const scheduledItems = readNumber(record?.scheduledItemsCount);

  return clamp(
    (views / 5000) * 16 +
      (impressions / 12000) * 10 +
      (followers / 500) * 6 +
      (engagementRate / 0.08) * 10 +
      (publishedItems / 8) * 5 +
      (scheduledItems / 12) * 3,
    0,
    50,
  );
}

function buildAdoptionScore(
  assignedProjectsCount: number,
  latestAssignedProjectMetrics: Array<{ metrics: unknown }>,
) {
  const totals = latestAssignedProjectMetrics.reduce(
    (accumulator, project) => {
      const metrics = readJsonRecord(project.metrics);

      return {
        views: accumulator.views + readNumber(metrics?.views),
        impressions: accumulator.impressions + readNumber(metrics?.impressions),
        followers: accumulator.followers + readNumber(metrics?.followers),
        engagementRate:
          accumulator.engagementRate + readNumber(metrics?.engagementRate),
      };
    },
    {
      views: 0,
      impressions: 0,
      followers: 0,
      engagementRate: 0,
    },
  );

  return clamp(
    (assignedProjectsCount / 5) * 10 +
      (totals.views / 15000) * 6 +
      (totals.followers / 1500) * 4 +
      (totals.engagementRate / 0.18) * 5,
    0,
    25,
  );
}

function buildRecencyScore(latestActivityAt: Date | null) {
  if (!latestActivityAt) {
    return 0;
  }

  const days = daysSince(latestActivityAt);

  return clamp(((90 - days) / 90) * 10, 0, 10);
}

function buildSignals(input: {
  recommendedPlatforms: Platform[];
  assignedProjectsCount: number;
  experimentMetrics: unknown;
}) {
  const signals: string[] = [];
  const experimentMetrics = readJsonRecord(input.experimentMetrics);
  const analytics = readJsonRecord(experimentMetrics?.analytics);
  const views = readNumber(analytics?.views);
  const engagementRate = readNumber(analytics?.engagementRate);
  const followers = readNumber(analytics?.followers);

  if (input.recommendedPlatforms.length > 0) {
    signals.push(`Cobre ${input.recommendedPlatforms.join(" + ")}`);
  }

  if (views > 0) {
    signals.push(`${views.toLocaleString("pt-BR")} views acumuladas em teste`);
  }

  if (engagementRate > 0) {
    signals.push(
      `${(engagementRate * 100).toFixed(1)}% de engagement agregado`,
    );
  }

  if (followers > 0) {
    signals.push(`${followers.toLocaleString("pt-BR")} followers observados`);
  }

  if (input.assignedProjectsCount > 0) {
    signals.push(`${input.assignedProjectsCount} projetos ja usam este profile`);
  }

  return signals.slice(0, 4);
}

function buildRanking(profile: {
  id: string;
  name: string;
  slug: string;
  status: PublicationProfileStatus;
  description: string | null;
  platformScope: unknown;
  strategyPreset: unknown;
  planningPreset: unknown;
  publishingPreset: unknown;
  guardrails: unknown;
  updatedAt: Date;
  createdAt: Date;
  sourceProject: { name: string } | null;
  experimentRuns: Array<{
    status: string;
    updatedAt: Date;
    resultMetrics: unknown;
  }>;
  assignedProjects: Array<{
    analyticsSnapshots: Array<{ metrics: unknown }>;
  }>;
}): ProfileRanking {
  const latestExperiment = profile.experimentRuns[0] ?? null;
  const recommendedPlatforms = readPlatformArray(profile.platformScope);
  const readinessScore = buildReadinessScore(profile);
  const experimentScore = buildExperimentScore(latestExperiment?.resultMetrics);
  const latestAssignedProjectMetrics = profile.assignedProjects
    .map((project) => project.analyticsSnapshots[0])
    .filter(
      (snapshot): snapshot is { metrics: unknown } =>
        snapshot !== undefined,
    );
  const adoptionScore = buildAdoptionScore(
    profile.assignedProjects.length,
    latestAssignedProjectMetrics,
  );
  const latestActivityCandidates = [
    profile.updatedAt,
    profile.createdAt,
    latestExperiment?.updatedAt ?? null,
  ].filter((value): value is Date => value instanceof Date);
  const latestActivityAt =
    latestActivityCandidates.length > 0
      ? latestActivityCandidates.sort(
          (left, right) => right.getTime() - left.getTime(),
        )[0]
      : null;
  const recencyScore = buildRecencyScore(latestActivityAt);
  const score = Math.round(
    clamp(readinessScore + experimentScore + adoptionScore + recencyScore, 0, 100),
  );

  return {
    profileId: profile.id,
    name: profile.name,
    slug: profile.slug,
    status: profile.status,
    description: profile.description,
    score,
    scoreLabel: scoreToLabel(score),
    readinessScore: Math.round(readinessScore),
    experimentScore: Math.round(experimentScore),
    adoptionScore: Math.round(adoptionScore),
    recencyScore: Math.round(recencyScore),
    assignedProjectsCount: profile.assignedProjects.length,
    recommendedPlatforms,
    keySignals: buildSignals({
      recommendedPlatforms,
      assignedProjectsCount: profile.assignedProjects.length,
      experimentMetrics: latestExperiment?.resultMetrics,
    }),
    sourceProjectName: profile.sourceProject?.name ?? null,
    latestExperimentStatus: latestExperiment?.status ?? null,
  };
}

async function getProfilesForInsights(where?: {
  status?: PublicationProfileStatus;
}) {
  return db.publicationProfile.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      sourceProject: {
        select: {
          name: true,
        },
      },
      experimentRuns: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 3,
        select: {
          status: true,
          updatedAt: true,
          resultMetrics: true,
        },
      },
      assignedProjects: {
        include: {
          analyticsSnapshots: {
            where: {
              scope: AnalyticsScope.PROJECT,
            },
            orderBy: {
              snapshotDate: "desc",
            },
            take: 1,
            select: {
              metrics: true,
            },
          },
        },
      },
    },
  });
}

export async function listPublicationProfileRankingsForAdmin() {
  await requirePlatformAdmin();

  const profiles = await getProfilesForInsights();

  return profiles
    .map((profile) => buildRanking(profile))
    .sort((left, right) => right.score - left.score);
}

function buildProjectFitScore(input: {
  projectPlatforms: Platform[];
  profilePlatforms: Platform[];
  projectGoal: string | null;
  profileGoal: string | null;
  projectTone: string | null;
  profileTone: string | null;
}) {
  let score = 0;

  if (input.projectPlatforms.length === 0) {
    score += 10;
  } else {
    const matches = input.projectPlatforms.filter((platform) =>
      input.profilePlatforms.includes(platform),
    ).length;

    score += clamp((matches / input.projectPlatforms.length) * 20, 0, 20);
  }

  const goalOverlap = countOverlap(
    keywordSet(input.projectGoal),
    keywordSet(input.profileGoal),
  );
  const toneOverlap = countOverlap(
    keywordSet(input.projectTone),
    keywordSet(input.profileTone),
  );

  score += clamp(goalOverlap * 3, 0, 6);
  score += clamp(toneOverlap * 2, 0, 4);

  return Math.round(score);
}

function buildRecommendationReasons(input: {
  ranking: ProfileRanking;
  fitScore: number;
  projectPlatforms: Platform[];
  projectGoal: string | null;
}) {
  const reasons = [`Score operacional ${input.ranking.score}/100`];

  if (input.ranking.assignedProjectsCount > 0) {
    reasons.push(
      `${input.ranking.assignedProjectsCount} projetos ativos ja usam este profile`,
    );
  }

  if (input.projectPlatforms.length === 0) {
    reasons.push("Serve como baseline mesmo antes da conta estar conectada");
  } else if (
    input.projectPlatforms.every((platform) =>
      input.ranking.recommendedPlatforms.includes(platform),
    )
  ) {
    reasons.push("Cobertura completa das plataformas conectadas no projeto");
  }

  if (input.fitScore >= 20) {
    reasons.push("Alta compatibilidade com o objetivo e a configuracao atual");
  } else if (input.projectGoal) {
    reasons.push("Boa proximidade com o objetivo editorial atual");
  }

  if (input.ranking.keySignals.length > 0) {
    reasons.push(input.ranking.keySignals[0]);
  }

  return reasons.slice(0, 4);
}

export async function recommendPublicationProfilesForProject(
  userId: string,
  projectId: string,
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
      socialAccounts: {
        where: {
          status: "CONNECTED",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  const profiles = await getProfilesForInsights({
    status: PublicationProfileStatus.ACTIVE,
  });

  const projectPlatforms = Array.from(
    new Set(project.socialAccounts.map((account) => account.platform)),
  );
  const projectGoal = project.strategy?.primaryGoal ?? null;
  const projectTone = project.strategy?.toneOfVoice ?? null;

  return profiles
    .map((profile) => {
      const ranking = buildRanking(profile);
      const strategyPreset = readJsonRecord(profile.strategyPreset);
      const fitScore = buildProjectFitScore({
        projectPlatforms,
        profilePlatforms: ranking.recommendedPlatforms,
        projectGoal,
        profileGoal:
          readString(strategyPreset?.primaryGoal) ??
          readString(strategyPreset?.targetAudience),
        projectTone,
        profileTone: readString(strategyPreset?.toneOfVoice),
      });
      const recommendationScore = Math.round(
        clamp(ranking.score + fitScore, 0, 120),
      );

      return {
        ...ranking,
        recommendationScore,
        fitScore,
        isCurrentProfile: project.publicationProfileId === ranking.profileId,
        reasons: buildRecommendationReasons({
          ranking,
          fitScore,
          projectPlatforms,
          projectGoal,
        }),
      } satisfies ProfileRecommendation;
    })
    .sort((left, right) => right.recommendationScore - left.recommendationScore)
    .slice(0, 3);
}
