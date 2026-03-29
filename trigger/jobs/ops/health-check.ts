import { logger, task } from "@trigger.dev/sdk";

export const healthCheckTask = task({
  id: "ops-health-check",
  run: async (payload: { source: string }) => {
    logger.info("Growth Agent health check triggered", payload);

    return {
      ok: true,
      source: payload.source,
      timestamp: new Date().toISOString(),
    };
  },
});
