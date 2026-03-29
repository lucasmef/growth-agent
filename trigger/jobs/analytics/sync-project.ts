import { logger, schedules, task, tasks } from "@trigger.dev/sdk";

import {
  listRunningExperimentProjectsForAnalytics,
  syncProjectAnalytics,
} from "@/modules/analytics/application/analytics.service";

export const analyticsSyncProjectTask = task({
  id: "analytics-sync-project",
  run: async (payload: { projectId: string }) => {
    logger.info("Syncing project analytics", payload);

    return syncProjectAnalytics(payload.projectId);
  },
});

export const runningExperimentsAnalyticsCronTask = schedules.task({
  id: "analytics-running-experiments-cron",
  cron: {
    pattern: "0 */8 * * *",
    timezone: "America/Sao_Paulo",
  },
  run: async () => {
    const projects = await listRunningExperimentProjectsForAnalytics();

    logger.info("Dispatching analytics sync for running experiments", {
      projectCount: projects.length,
    });

    for (const project of projects) {
      await tasks.trigger("analytics-sync-project", {
        projectId: project.id,
      });
    }

    return {
      dispatched: projects.length,
      projectIds: projects.map((project) => project.id),
    };
  },
});
