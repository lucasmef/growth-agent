import { z } from "zod";

export const createWorkspaceInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;
