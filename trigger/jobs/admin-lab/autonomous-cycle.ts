import { logger, schedules, task, tasks } from "@trigger.dev/sdk";

import {
  listRunningExperimentProjectIds,
  runAutonomousExperimentCycle,
} from "@/modules/admin-lab/application/experiment-runtime.service";

export const autonomousExperimentCycleTask = task({
  id: "admin-lab-autonomous-cycle",
  run: async (payload: { projectId: string }) => {
    logger.info("Running autonomous experiment cycle", payload);

    return runAutonomousExperimentCycle(payload.projectId);
  },
});

export const runningExperimentsCronTask = schedules.task({
  id: "admin-lab-running-experiments-cron",
  cron: {
    pattern: "0 */6 * * *",
    timezone: "America/Sao_Paulo",
  },
  run: async () => {
    const projectIds = await listRunningExperimentProjectIds();

    logger.info("Dispatching autonomous experiment cycles", {
      projectCount: projectIds.length,
    });

    for (const projectId of projectIds) {
      await tasks.trigger("admin-lab-autonomous-cycle", {
        projectId,
      });
    }

    return {
      dispatched: projectIds.length,
      projectIds,
    };
  },
});
