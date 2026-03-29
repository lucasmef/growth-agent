import { AgentRunKind, AgentRunStatus, DecisionType } from "@prisma/client";

import { db } from "@/lib/db";

function toJsonPayload(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function createAgentRun(input: {
  projectId: string;
  kind: AgentRunKind;
  model?: string;
  promptVersion?: string;
  inputPayload?: unknown;
}) {
  return db.agentRun.create({
    data: {
      projectId: input.projectId,
      kind: input.kind,
      status: AgentRunStatus.RUNNING,
      model: input.model,
      promptVersion: input.promptVersion,
      inputPayload:
        input.inputPayload === undefined ? undefined : toJsonPayload(input.inputPayload),
      startedAt: new Date(),
    },
  });
}

export async function completeAgentRun(input: {
  agentRunId: string;
  outputPayload?: unknown;
}) {
  return db.agentRun.update({
    where: {
      id: input.agentRunId,
    },
    data: {
      status: AgentRunStatus.SUCCEEDED,
      outputPayload:
        input.outputPayload === undefined ? undefined : toJsonPayload(input.outputPayload),
      finishedAt: new Date(),
    },
  });
}

export async function failAgentRun(input: {
  agentRunId: string;
  errorMessage: string;
}) {
  return db.agentRun.update({
    where: {
      id: input.agentRunId,
    },
    data: {
      status: AgentRunStatus.FAILED,
      errorMessage: input.errorMessage,
      finishedAt: new Date(),
    },
  });
}

export async function logDecision(input: {
  agentRunId: string;
  stepKey: string;
  decisionType: DecisionType;
  summary: string;
  payload?: unknown;
}) {
  return db.decisionLog.create({
    data: {
      agentRunId: input.agentRunId,
      stepKey: input.stepKey,
      decisionType: input.decisionType,
      summary: input.summary,
      payload: input.payload === undefined ? undefined : toJsonPayload(input.payload),
    },
  });
}
